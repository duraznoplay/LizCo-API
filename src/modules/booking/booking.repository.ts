import { Injectable } from '@nestjs/common'
import {
  ENTERPRISE_TOURS_SCHEMA,
  POSTGREST_PUBLIC_SCHEMA,
  SupabaseAdminService,
} from '../../supabase/supabase-admin.service'

export type PackageRow = {
  id: string
  base_price: number
  duration_days: number
  slug?: string
}

@Injectable()
export class BookingRepository {
  constructor(private readonly supa: SupabaseAdminService) {}

  async packageBySlug(slug: string): Promise<PackageRow | null> {
    const { data, error } = await this.supa.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('packages')
      .select('id, base_price, duration_days, slug')
      .eq('slug', slug)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data as PackageRow | null) ?? null
  }

  async calculatePartyTotal(input: {
    packageId: string
    travelDate: string
    paxCount: number
  }): Promise<number> {
    const { data, error } = await this.supa.client
      .schema(POSTGREST_PUBLIC_SCHEMA)
      .rpc('lizco_calculate_total_price', {
        p_package_id: input.packageId,
        p_travel_date: input.travelDate,
        p_pax_count: input.paxCount,
      })
    if (error) throw new Error(error.message)
    const total = Number(data)
    if (!Number.isFinite(total)) throw new Error('pricing_unavailable')
    return total
  }

  async upsertCustomer(input: {
    first_name: string
    last_name: string
    email: string
    phone: string | null
  }): Promise<string> {
    // INSERT new customers (sets lead_source for attribution). On email conflict fall through.
    const { data: newRow, error: insertErr } = await this.supa.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('customers')
      .insert({ ...input, lead_source: 'lizco_global_tours_web' })
      .select('id')
      .maybeSingle()

    if (newRow) return (newRow as { id: string }).id

    // Any error other than a unique violation is unexpected.
    if (insertErr?.code !== '23505') {
      throw new Error(insertErr?.message ?? 'customer_insert_failed')
    }

    // Returning customer — update contact fields only, preserving original lead_source.
    const { data: existing, error: updateErr } = await this.supa.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('customers')
      .update({ first_name: input.first_name, last_name: input.last_name, phone: input.phone })
      .eq('email', input.email)
      .select('id')
      .single()

    if (updateErr || !existing) throw new Error(updateErr?.message ?? 'customer_upsert_failed')
    return (existing as { id: string }).id
  }

  async createBookingWithAddOns(input: {
    package_id: string
    customer_id: string
    travel_date: string
    travelers_count: number
    base_price_applied: number
    season_multiplier_applied: number
    total_calculated_price: number
    addOns: { id: string; quantity: number; price: number }[]
  }): Promise<string> {
    const { data, error } = await this.supa.client
      .schema(POSTGREST_PUBLIC_SCHEMA)
      .rpc('lizco_create_booking', {
        p_package_id:       input.package_id,
        p_customer_id:      input.customer_id,
        p_travel_date:      input.travel_date,
        p_travelers_count:  input.travelers_count,
        p_base_price:       input.base_price_applied,
        p_multiplier:       input.season_multiplier_applied,
        p_total_price:      input.total_calculated_price,
        p_addon_ids:        input.addOns.map((a) => a.id),
        p_addon_quantities: input.addOns.map((a) => a.quantity),
        p_addon_prices:     input.addOns.map((a) => a.price),
      })
    if (error || !data) throw new Error(error?.message ?? 'booking_create_failed')
    return data as string
  }
}
