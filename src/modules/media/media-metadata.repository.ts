import { Injectable } from '@nestjs/common'
import { SupabaseAdminService } from '../../supabase/supabase-admin.service'
import type { CreateMediaDto, UpdateMediaDto } from './dto/media-admin.dto'

export interface MediaMetadataRow {
  id: string
  s3_key: string
  section: string
  slug: string | null
  variant: string | null
  title: string | null
  description: string | null
  alt_text: string | null
  size_bytes: number | null
  content_type: string | null
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

@Injectable()
export class MediaMetadataRepository {
  constructor(private readonly supabase: SupabaseAdminService) {}

  async create(data: CreateMediaDto & { s3_key: string; size_bytes?: number; content_type?: string }): Promise<MediaMetadataRow> {
    const { data: result, error } = await this.supabase.client
      .schema('enterprise_tours')
      .from('media_metadata')
      .insert({
        s3_key: data.s3_key,
        section: data.section,
        slug: data.slug || null,
        variant: data.variant || null,
        title: data.title || null,
        description: data.description || null,
        alt_text: data.alt_text || null,
        size_bytes: data.size_bytes || null,
        content_type: data.content_type || null,
      })
      .select()
      .single()

    if (error) throw error
    return result
  }

  async findByKey(s3_key: string): Promise<MediaMetadataRow | null> {
    const { data, error } = await this.supabase.client
      .schema('enterprise_tours')
      .from('media_metadata')
      .select('*')
      .eq('s3_key', s3_key)
      .single()

    if (error) return null
    return data
  }

  async findById(id: string): Promise<MediaMetadataRow | null> {
    const { data, error } = await this.supabase.client
      .schema('enterprise_tours')
      .from('media_metadata')
      .select('*')
      .eq('id', id)
      .single()

    if (error) return null
    return data
  }

  async findAll(filters?: {
    section?: string
    slug?: string
    variant?: string
    limit?: number
    offset?: number
  }): Promise<{ items: MediaMetadataRow[]; total: number }> {
    let query = this.supabase.client
      .schema('enterprise_tours')
      .from('media_metadata')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (filters?.section) {
      query = query.eq('section', filters.section)
    }
    if (filters?.slug) {
      query = query.eq('slug', filters.slug)
    }
    if (filters?.variant) {
      query = query.eq('variant', filters.variant)
    }

    const limit = filters?.limit || 50
    const offset = filters?.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error
    return {
      items: data || [],
      total: count || 0,
    }
  }

  async update(id: string, data: UpdateMediaDto): Promise<MediaMetadataRow> {
    const updatePayload: Record<string, any> = {}
    if (data.title !== undefined) updatePayload.title = data.title || null
    if (data.description !== undefined) updatePayload.description = data.description || null
    if (data.alt_text !== undefined) updatePayload.alt_text = data.alt_text || null
    if (data.slug !== undefined) updatePayload.slug = data.slug || null
    if (data.variant !== undefined) updatePayload.variant = data.variant || null

    const { data: result, error } = await this.supabase.client
      .schema('enterprise_tours')
      .from('media_metadata')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return result
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .schema('enterprise_tours')
      .from('media_metadata')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  async deleteByKey(s3_key: string): Promise<void> {
    const { error } = await this.supabase.client
      .schema('enterprise_tours')
      .from('media_metadata')
      .delete()
      .eq('s3_key', s3_key)

    if (error) throw error
  }
}
