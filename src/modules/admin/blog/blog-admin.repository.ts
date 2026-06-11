import { Injectable } from '@nestjs/common'
import { ENTERPRISE_TOURS_SCHEMA, SupabaseAdminService } from '../../../supabase/supabase-admin.service'
import type { BlogQueryDto } from './dto/blog-query.dto'
import { pgError } from '../../../common/utils/pg-error'
import type { BlogAdminRow, BlogAdminListItem } from '@/types/db.types'
import { BlogStatus } from './dto/blog-status.enum'
import type { BlogPostEntity } from './entities/blog-post.entity'

const TABLE = 'blogs'

@Injectable()
export class BlogAdminRepository {
  constructor(private readonly supabase: SupabaseAdminService) {}

  private get client() {
    return this.supabase.client.schema(ENTERPRISE_TOURS_SCHEMA).from(TABLE)
  }

  async findAll(
    query: BlogQueryDto,
  ): Promise<{ items: BlogAdminListItem[]; total: number; page: number; limit: number }> {
    const { page, limit, search, status, startDate, endDate, featured, sort, order } = query
    const from = (page - 1) * limit

    let builder = this.client
      .select('id, title, slug, image, author, status, featured, reading_time_minutes, created_at, updated_at', {
        count: 'exact',
      })
      .is('deleted_at', null) // Soft-delete filter
      .range(from, from + limit - 1)

    // Apply filters
    if (search) builder = builder.ilike('title', `%${search}%`)
    if (status) builder = builder.eq('status', status)
    if (featured !== undefined) builder = builder.eq('featured', featured)
    if (startDate) builder = builder.gte('created_at', startDate)
    if (endDate) builder = builder.lte('created_at', endDate)

    // Apply sorting
    const ascending = order === 'asc'
    builder = builder.order(sort || 'created_at', { ascending })

    const { data, error, count } = await builder
    if (error) throw pgError(error)
    return { items: (data ?? []) as BlogAdminListItem[], total: count ?? 0, page, limit }
  }

  async findById(id: string): Promise<BlogPostEntity | null> {
    const { data, error } = await this.client.select('*').eq('id', id).is('deleted_at', null).maybeSingle()
    if (error) throw pgError(error)
    return (data as BlogPostEntity | null) ?? null
  }

  async findBySlug(slug: string): Promise<BlogPostEntity | null> {
    const { data, error } = await this.client
      .select('*')
      .eq('slug', slug)
      .eq('status', BlogStatus.PUBLISHED)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw pgError(error)
    return (data as BlogPostEntity | null) ?? null
  }

  async existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
    let builder = this.client.select('id', { head: true, count: 'exact' }).eq('slug', slug).is('deleted_at', null)
    if (excludeId) builder = builder.neq('id', excludeId)
    const { count, error } = await builder
    if (error) throw pgError(error)
    return (count ?? 0) > 0
  }

  async create(data: {
    title: string
    slug: string
    content: string
    image?: string
    status?: BlogStatus
    meta_description?: string
    meta_keywords?: string
    featured?: boolean
    reading_time_minutes: number
    created_by?: string
  }): Promise<BlogPostEntity> {
    const { data: row, error } = await this.client.insert(data).select().single()
    if (error) throw pgError(error)
    return row as BlogPostEntity
  }

  async update(
    id: string,
    data: Partial<{
      title: string
      slug: string
      content: string
      image: string
      status: BlogStatus
      meta_description: string
      meta_keywords: string
      featured: boolean
      reading_time_minutes: number
      updated_by: string
    }>,
  ): Promise<BlogPostEntity | null> {
    const { data: row, error } = await this.client
      .update(data)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .maybeSingle()
    if (error) throw pgError(error)
    return (row as BlogPostEntity | null) ?? null
  }

  async delete(id: string): Promise<void> {
    // Soft delete: set deleted_at timestamp
    const { error } = await this.client.update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (error) throw pgError(error)
  }

  async restore(id: string): Promise<BlogPostEntity | null> {
    const { data, error } = await this.client
      .update({ deleted_at: null })
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw pgError(error)
    return (data as BlogPostEntity | null) ?? null
  }

  async bulkUpdateStatus(ids: string[], status: BlogStatus): Promise<void> {
    const { error } = await this.client.update({ status }).in('id', ids).is('deleted_at', null)
    if (error) throw pgError(error)
  }

  async countByStatus(): Promise<Record<BlogStatus, number>> {
    const results = {
      [BlogStatus.DRAFT]: 0,
      [BlogStatus.PUBLISHED]: 0,
      [BlogStatus.ARCHIVED]: 0,
    }

    for (const status of Object.values(BlogStatus)) {
      const { count, error } = await this.client
        .select('id', { count: 'exact', head: true })
        .eq('status', status)
        .is('deleted_at', null)
      if (error) throw pgError(error)
      results[status] = count ?? 0
    }

    return results
  }
}
