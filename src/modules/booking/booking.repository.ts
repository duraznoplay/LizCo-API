import { Injectable } from '@nestjs/common'
import {
  ENTERPRISE_TOURS_SCHEMA,
  POSTGREST_PUBLIC_SCHEMA,
  SupabaseAdminService,
} from '../../supabase/supabase-admin.service'
import type { CatalogMeta, PricingModel } from './domain/departure-pricing'

/**
 * Model B data access (canonical catalog/pricing/booking — see
 * LizCo Global Tours/docs/ADR-modelo-canonico-booking.md).
 * The legacy enterprise_tours schema is only touched for CRM customers.
 */

export type PackageRow = {
  id: string
  slug: string
  name: string
  pricing_model: PricingModel
  nights: number
  catalog_meta: CatalogMeta | null
}

export type StandardDepartureRow = {
  id: string
  package_id: string
  departure_date: string
  return_date: string | null
  price_multiple_usd: number | null
  price_double_usd: number | null
  price_single_usd: number | null
  season: string | null
  price_type: string | null
  label: string | null
  available_spots: number | null
  is_active: boolean
}

export type HotelDepartureRow = {
  id: string
  hotel_id: string
  departure_date: string
  return_date: string | null
  price_multiple_usd: number | null
  price_double_usd: number | null
  price_single_usd: number | null
  season: string | null
  label: string | null
  available_spots: number | null
  is_active: boolean
}

export type MedellinCellRow = {
  id: string
  hotel_id: string
  season: string
  nights: number
  price_multiple_usd: number | null
  price_double_usd: number | null
  is_active: boolean
}

export type HotelRow = {
  id: string
  package_id: string
  name: string
  meal_plan: string | null
  is_active: boolean
}

@Injectable()
export class BookingRepository {
  constructor(private readonly supa: SupabaseAdminService) {}

  private get pub() {
    return this.supa.client.schema(POSTGREST_PUBLIC_SCHEMA)
  }

  async packageBySlug(slug: string): Promise<PackageRow | null> {
    const { data, error } = await this.pub
      .from('tour_packages')
      .select('id, slug, name, pricing_model, nights, catalog_meta')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data as PackageRow | null) ?? null
  }

  async standardDepartureById(id: string): Promise<StandardDepartureRow | null> {
    const { data, error } = await this.pub
      .from('package_departures')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data as StandardDepartureRow | null) ?? null
  }

  async standardDeparturesByDate(packageId: string, date: string): Promise<StandardDepartureRow[]> {
    const { data, error } = await this.pub
      .from('package_departures')
      .select('*')
      .eq('package_id', packageId)
      .eq('departure_date', date)
      .eq('is_active', true)
    if (error) throw new Error(error.message)
    return (data ?? []) as StandardDepartureRow[]
  }

  async hotelDepartureById(id: string): Promise<HotelDepartureRow | null> {
    const { data, error } = await this.pub
      .from('hotel_departures')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data as HotelDepartureRow | null) ?? null
  }

  async hotelDepartureByKey(hotelId: string, date: string): Promise<HotelDepartureRow | null> {
    const { data, error } = await this.pub
      .from('hotel_departures')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('departure_date', date)
      .eq('is_active', true)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data as HotelDepartureRow | null) ?? null
  }

  async medellinCellById(id: string): Promise<MedellinCellRow | null> {
    const { data, error } = await this.pub
      .from('medellin_price_grid')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data as MedellinCellRow | null) ?? null
  }

  async medellinCellByKey(hotelId: string, season: string, nights: number): Promise<MedellinCellRow | null> {
    const { data, error } = await this.pub
      .from('medellin_price_grid')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('season', season)
      .eq('nights', nights)
      .eq('is_active', true)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data as MedellinCellRow | null) ?? null
  }

  async hotelById(id: string): Promise<HotelRow | null> {
    const { data, error } = await this.pub
      .from('package_hotels')
      .select('id, package_id, name, meal_plan, is_active')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data as HotelRow | null) ?? null
  }

  async createBooking(row: {
    package_id: string
    departure_id: string | null
    hotel_departure_id: string | null
    hotel_id: string | null
    room_type: string
    medellin_nights: number | null
    adults: number
    children_ages: number[]
    guest_name: string
    guest_email: string
    guest_phone: string | null
    guest_country: string | null
    special_requests: string | null
    total_usd: number
    payment_mode: string
    deposit_usd: number | null
    addons_snapshot: { id: string; name: string; quantity: number; price_usd: number }[]
    display_currency: string
  }): Promise<string> {
    const { data, error } = await this.pub
      .from('bookings')
      .insert({ ...row, status: 'pending' })
      .select('id')
      .single()
    if (error || !data) throw new Error(error?.message ?? 'booking_create_failed')
    return (data as { id: string }).id
  }

  /**
   * Persists relational add-on rows for ids that exist in public.package_addons.
   * Legacy catalog ids ("A1"…) only live in addons_snapshot — non-fatal.
   */
  async insertBookingAddons(
    bookingId: string,
    addOns: { id: string; quantity: number; price_usd: number }[],
  ): Promise<void> {
    const uuidLike = addOns.filter((a) => /^[0-9a-f-]{36}$/i.test(a.id))
    if (!uuidLike.length) return
    const { data: known, error: qErr } = await this.pub
      .from('package_addons')
      .select('id')
      .in('id', uuidLike.map((a) => a.id))
    if (qErr) return
    const knownSet = new Set((known ?? []).map((r: { id: string }) => r.id))
    const rows = uuidLike
      .filter((a) => knownSet.has(a.id))
      .map((a) => ({ booking_id: bookingId, addon_id: a.id, quantity: a.quantity, price_usd: a.price_usd }))
    if (!rows.length) return
    await this.pub.from('booking_addons').insert(rows)
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
}
