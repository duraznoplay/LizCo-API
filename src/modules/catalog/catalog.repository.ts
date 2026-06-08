import { Injectable } from '@nestjs/common'
import {
  ENTERPRISE_TOURS_SCHEMA,
  SupabaseAdminService,
} from '../../supabase/supabase-admin.service'

import type { AddOnRow } from './domain/entities/add-on.entity'
import type {
  DestinationRow,
  PackageListRow,
  PackageIdRow,
  BlogPublicListItem,
  BlogPublicDetail,
} from '@/types/db.types'

@Injectable()
export class CatalogRepository {
  constructor(private readonly supa: SupabaseAdminService) {}

  async listDestinations(): Promise<DestinationRow[]> {
    const { data, error } = await this.supa.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('destinations')
      .select('name, slug, description')
      .eq('is_active', true)
      .order('name', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []) as DestinationRow[]
  }

  async listPackages(): Promise<PackageListRow[]> {
    const { data, error } = await this.supa.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('packages')
      .select('name, slug, base_price, duration_days, duration_nights, destinations(name, slug)')
      .eq('is_active', true)
      .order('name', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []) as PackageListRow[]
  }

  async listAddOnsForPackageSlug(packageSlug: string): Promise<AddOnRow[]> {
    const { data: pkg, error: pe } = await this.supa.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('packages')
      .select('id')
      .eq('slug', packageSlug)
      .maybeSingle()
    if (pe) throw new Error(pe.message)
    if (!pkg) return []

    const pkgId = (pkg as PackageIdRow).id

    const junction = await this.supa.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('package_add_ons')
      .select('add_ons ( id, name, type, price, is_active )')
      .eq('package_id', pkgId)

    if (!junction.error && junction.data?.length) {
      return this.flattenEmbeddedAddOns(junction.data as unknown as { add_ons: AddOnRow | AddOnRow[] | null }[])
    }

    const direct = await this.supa.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('add_ons')
      .select('id, name, type, price, is_active')
      .eq('package_id', pkgId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (direct.error) throw new Error(direct.error.message)
    return (direct.data as AddOnRow[]) ?? []
  }

  async listAllAddOns(): Promise<AddOnRow[]> {
    const { data, error } = await this.supa.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('add_ons')
      .select('id, name, type, price, is_active')
      .eq('is_active', true)
      .order('name', { ascending: true })
    if (error) throw new Error(error.message)
    return (data as AddOnRow[]) ?? []
  }

  async listBlogs(): Promise<BlogPublicListItem[]> {
    const { data, error } = await this.supa.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('blogs')
      .select('slug, title, excerpt, published_at')
      .eq('is_active', true)
      .order('published_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []) as BlogPublicListItem[]
  }

  async blogBySlug(slug: string): Promise<BlogPublicDetail | null> {
    const { data, error } = await this.supa.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('blogs')
      .select('slug, title, excerpt, body, published_at')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data as BlogPublicDetail | null) ?? null
  }

  private flattenEmbeddedAddOns(rows: { add_ons: AddOnRow | AddOnRow[] | null }[]): AddOnRow[] {
    const out: AddOnRow[] = []
    for (const row of rows) {
      const raw = row.add_ons
      const list = raw === null || raw === undefined ? [] : Array.isArray(raw) ? raw : [raw]
      for (const a of list) {
        if (a?.is_active) out.push(a)
      }
    }
    return out.sort((x, y) => x.name.localeCompare(y.name))
  }
}
