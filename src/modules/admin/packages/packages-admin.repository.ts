import { Injectable } from '@nestjs/common'
import { ENTERPRISE_TOURS_SCHEMA, SupabaseAdminService } from '../../../supabase/supabase-admin.service'
import type { CreatePackageDto } from './dto/create-package.dto'
import type { UpdatePackageDto } from './dto/update-package.dto'
import type { PackagesQueryDto } from './dto/packages-query.dto'

export interface TourPackage {
  id: string
  title: string
  description: string
  price: number
  features: string[] | null
  created_at: string
  updated_at: string
}

export interface PaginatedPackages {
  data: TourPackage[]
  total: number
  page: number
  limit: number
}

@Injectable()
export class PackagesAdminRepository {
  constructor(private readonly supabase: SupabaseAdminService) {}

  async findAll(query: PackagesQueryDto): Promise<PaginatedPackages> {
    const { page, limit, search } = query
    const from = (page - 1) * limit
    const to = from + limit - 1

    let q = this.supabase.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('packages')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (search) {
      q = q.ilike('title', `%${search}%`)
    }

    const { data, error, count } = await q

    if (error) throw new Error(error.message)

    return { data: (data ?? []) as TourPackage[], total: count ?? 0, page, limit }
  }

  async findById(id: string): Promise<TourPackage | null> {
    const { data, error } = await this.supabase.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('packages')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data as TourPackage | null
  }

  async create(dto: CreatePackageDto): Promise<TourPackage> {
    const { data, error } = await this.supabase.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('packages')
      .insert(dto)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as TourPackage
  }

  async update(id: string, dto: UpdatePackageDto): Promise<TourPackage | null> {
    const { data, error } = await this.supabase.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('packages')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data as TourPackage | null
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('packages')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
  }
}
