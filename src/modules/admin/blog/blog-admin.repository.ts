import { Injectable } from '@nestjs/common'
import { ENTERPRISE_TOURS_SCHEMA, SupabaseAdminService } from '../../../supabase/supabase-admin.service'
import type { BlogQueryDto } from './dto/blog-query.dto'

const TABLE = 'blogs'

@Injectable()
export class BlogAdminRepository {
  constructor(private readonly supabase: SupabaseAdminService) {}

  private get client() {
    return this.supabase.client.schema(ENTERPRISE_TOURS_SCHEMA).from(TABLE)
  }

  async findAll(query: BlogQueryDto) {
    const { page, limit, search } = query
    const from = (page - 1) * limit

    let builder = this.client
      .select('id, title, slug, image, author, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1)

    if (search) builder = builder.ilike('title', `%${search}%`)

    const { data, error, count } = await builder
    if (error) throw new Error(error.message)
    return { items: data ?? [], total: count ?? 0, page, limit }
  }

  async findById(id: string) {
    const { data, error } = await this.client.select('*').eq('id', id).maybeSingle()
    if (error) throw new Error(error.message)
    return data ?? null
  }

  async existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
    let builder = this.client.select('id', { head: true, count: 'exact' }).eq('slug', slug)
    if (excludeId) builder = builder.neq('id', excludeId)
    const { count, error } = await builder
    if (error) throw new Error(error.message)
    return (count ?? 0) > 0
  }

  async create(data: { title: string; slug: string; content: string; image?: string }) {
    const { data: row, error } = await this.client.insert(data).select().single()
    if (error) throw new Error(error.message)
    return row
  }

  async update(id: string, data: Partial<{ title: string; slug: string; content: string; image: string }>) {
    const { data: row, error } = await this.client.update(data).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return row
  }

  async delete(id: string) {
    const { error } = await this.client.delete().eq('id', id)
    if (error) throw new Error(error.message)
  }
}
