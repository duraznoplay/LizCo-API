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

  async findCustomerByEmail(email: string): Promise<{ id: string } | null> {
    const { data, error } = await this.supa.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('customers')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data as { id: string } | null) ?? null
  }

  async insertCustomer(input: {
    first_name: string
    last_name: string
    email: string
    phone: string | null
  }): Promise<string> {
    const { data, error } = await this.supa.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('customers')
      .insert({ ...input, lead_source: 'lizco_global_tours_web' })
      .select('id')
      .single()
    if (error || !data) throw new Error(error?.message ?? 'customer_insert_failed')
    return (data as { id: string }).id
  }

  async updateCustomer(
    id: string,
    patch: { first_name: string; last_name: string; phone?: string | null },
  ): Promise<void> {
    const { error } = await this.supa.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('customers')
      .update(patch)
      .eq('id', id)
    if (error) throw new Error(error.message)
  }

  async insertBooking(input: {
    package_id: string
    customer_id: string
    travel_date: string
    travelers_count: number
    base_price_applied: number
    season_multiplier_applied: number
    total_calculated_price: number
  }): Promise<string> {
    const { data, error } = await this.supa.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('bookings')
      .insert({
        ...input,
        status: 'PENDING',
        lead_source: 'lizco_global_tours_web',
      })
      .select('id')
      .single()
    if (error || !data) throw new Error(error?.message ?? 'booking_insert_failed')
    return (data as { id: string }).id
  }

  async insertBookingAddOn(input: {
    booking_id: string
    add_on_id: string
    quantity: number
    calculated_price: number
  }): Promise<void> {
    const { error } = await this.supa.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('booking_add_ons')
      .insert(input)
    if (error) throw new Error(error.message)
  }
}
