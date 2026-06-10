import { Injectable } from '@nestjs/common'
import { ENTERPRISE_TOURS_SCHEMA, SupabaseAdminService } from '../../../supabase/supabase-admin.service'
import type { CreatePackageDto } from './dto/create-package.dto'
import type { UpdatePackageDto } from './dto/update-package.dto'
import type { PackagesQueryDto } from './dto/packages-query.dto'
import type { PackageAdminRow, DestinationRow } from '@/types/db.types'

export interface PaginatedPackages {
  data: PackageAdminRow[]
  total: number
  page: number
  limit: number
}

@Injectable()
export class PackagesAdminRepository {
  constructor(private readonly supabase: SupabaseAdminService) {}

  async findAll(query: PackagesQueryDto): Promise<PaginatedPackages> {
    const { page, limit, search, is_active } = query
    const from = (page - 1) * limit
    const to = from + limit - 1

    let q = this.supabase.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('packages')
      .select(
        'id,name,slug,description,base_price,duration_days,duration_nights,is_active,destination_id,features,image,created_at,updated_at,destinations(id,name,slug)',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(from, to)

    if (search) {
      q = q.ilike('name', `%${search}%`)
    }

    if (is_active !== undefined) {
      q = q.eq('is_active', is_active)
    }

    const { data, error, count } = await q

    if (error) throw new Error(error.message)

    return {
      data: (data ?? []) as PackageAdminRow[],
      total: count ?? 0,
      page,
      limit,
    }
  }

  async findById(id: string): Promise<PackageAdminRow | null> {
    const { data, error } = await this.supabase.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('packages')
      .select('*,destinations(id,name,slug)')
      .eq('id', id)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return (data as PackageAdminRow | null) ?? null
  }

  async create(dto: CreatePackageDto): Promise<PackageAdminRow> {
    const { data, error } = await this.supabase.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('packages')
      .insert(dto)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as PackageAdminRow
  }

  async update(id: string, dto: UpdatePackageDto): Promise<PackageAdminRow | null> {
    const payload = { ...dto, updated_at: new Date().toISOString() }
    const { data, error } = await this.supabase.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('packages')
      .update(payload)
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) throw new Error(error.message)
    return (data as PackageAdminRow | null) ?? null
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('packages')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
  }

  async existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
    let builder = this.supabase.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('packages')
      .select('id', { head: true, count: 'exact' })
      .eq('slug', slug)

    if (excludeId) {
      builder = builder.neq('id', excludeId)
    }

    const { count, error } = await builder

    if (error) throw new Error(error.message)
    return (count ?? 0) > 0
  }

  async findDestinations(): Promise<DestinationRow[]> {
    const { data, error } = await this.supabase.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('destinations')
      .select('id,name,slug')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw new Error(error.message)
    return (data ?? []) as DestinationRow[]
  }
}
