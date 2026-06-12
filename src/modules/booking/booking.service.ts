import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import type { AddOnRow } from '../catalog/domain/entities/add-on.entity'
import { CatalogService } from '../catalog/catalog.service'
import type {
  BookingQuoteRequestDto,
  BookingQuoteResponseDto,
  BookingSubmitRequestDto,
  BookingSubmitResponseDto,
  QuoteDepartureInfo,
} from './dto/booking.dto'
import {
  BookingRepository,
  type PackageRow,
} from './booking.repository'
import { buildBoldCheckoutPayload, computeAddOnsUsdSelected, toLocalYmd } from './domain/pricing'
import {
  depositUsd,
  PricingError,
  quoteParty,
  type Occupancy,
  type PartyQuote,
  type PriceRow,
} from './domain/departure-pricing'

interface ResolvedDeparture {
  priceRow: PriceRow
  info: QuoteDepartureInfo
  /** FK targets for public.bookings */
  departureId: string | null
  hotelDepartureId: string | null
  hotelId: string | null
  medellinNights: number | null
}

@Injectable()
export class BookingService {
  private readonly log = new Logger(BookingService.name)

  constructor(
    private readonly repo: BookingRepository,
    private readonly catalog: CatalogService,
  ) {}

  /**
   * Resolves the concrete departure (and its exact tarifario prices) for a
   * package according to its pricing_model. No derived prices.
   */
  private async resolveDeparture(
    pkg: PackageRow,
    sel: {
      departureId?: string
      date?: string
      returnDate?: string
      hotelId?: string
      nights?: number
      season?: string
    },
  ): Promise<ResolvedDeparture> {
    if (pkg.pricing_model === 'standard') {
      let row = null
      if (sel.departureId) {
        row = await this.repo.standardDepartureById(sel.departureId)
        if (row && row.package_id !== pkg.id) row = null
      } else if (sel.date) {
        const rows = await this.repo.standardDeparturesByDate(pkg.id, sel.date)
        if (rows.length > 1) {
          const match = sel.returnDate ? rows.filter((r) => r.return_date === sel.returnDate) : rows
          if (match.length !== 1) throw new ConflictException('ambiguous_departure')
          row = match[0]
        } else {
          row = rows[0] ?? null
        }
      }
      if (!row || !row.is_active) throw new NotFoundException('departure_not_found')
      return {
        priceRow: row,
        departureId: row.id,
        hotelDepartureId: null,
        hotelId: null,
        medellinNights: null,
        info: {
          id: row.id,
          date: row.departure_date,
          returnDate: row.return_date,
          hotelId: null,
          hotelName: null,
          season: row.season,
          nights: pkg.nights,
          label: row.label,
          availableSpots: row.available_spots,
        },
      }
    }

    if (pkg.pricing_model === 'hotel_based') {
      let row = null
      if (sel.departureId) {
        row = await this.repo.hotelDepartureById(sel.departureId)
      } else if (sel.hotelId && sel.date) {
        row = await this.repo.hotelDepartureByKey(sel.hotelId, sel.date)
      } else {
        throw new BadRequestException('hotel_required')
      }
      if (!row || !row.is_active) throw new NotFoundException('departure_not_found')
      const hotel = await this.repo.hotelById(row.hotel_id)
      if (!hotel || hotel.package_id !== pkg.id || !hotel.is_active) {
        throw new NotFoundException('departure_not_found')
      }
      return {
        priceRow: row,
        departureId: null,
        hotelDepartureId: row.id,
        hotelId: hotel.id,
        medellinNights: null,
        info: {
          id: row.id,
          date: row.departure_date,
          returnDate: row.return_date,
          hotelId: hotel.id,
          hotelName: hotel.name,
          season: row.season,
          nights: pkg.nights,
          label: row.label,
          availableSpots: row.available_spots,
        },
      }
    }

    // hotel_season (Medellín): temporada × noches × hotel
    let row = null
    if (sel.departureId) {
      row = await this.repo.medellinCellById(sel.departureId)
    } else if (sel.hotelId && sel.nights && sel.season) {
      row = await this.repo.medellinCellByKey(sel.hotelId, sel.season, sel.nights)
    } else {
      throw new BadRequestException('hotel_season_selection_required')
    }
    if (!row || !row.is_active) throw new NotFoundException('departure_not_found')
    const hotel = await this.repo.hotelById(row.hotel_id)
    if (!hotel || hotel.package_id !== pkg.id || !hotel.is_active) {
      throw new NotFoundException('departure_not_found')
    }
    return {
      priceRow: { ...row, price_single_usd: null },
      departureId: null,
      hotelDepartureId: null,
      hotelId: hotel.id,
      medellinNights: row.nights,
      info: {
        id: row.id,
        date: null,
        returnDate: null,
        hotelId: hotel.id,
        hotelName: hotel.name,
        season: row.season,
        nights: row.nights,
        label: null,
        availableSpots: null,
      },
    }
  }

  private priceParty(
    pkg: PackageRow,
    resolved: ResolvedDeparture,
    occupancy: Occupancy,
    adults: number,
    childrenAges: number[],
  ): PartyQuote {
    try {
      return quoteParty(resolved.priceRow, occupancy, adults, childrenAges, pkg.catalog_meta)
    } catch (e) {
      if (e instanceof PricingError) throw new BadRequestException(e.code)
      throw e
    }
  }

  async quote(q: BookingQuoteRequestDto): Promise<BookingQuoteResponseDto> {
    const pkg = await this.repo.packageBySlug(q.packageSlug)
    if (!pkg) throw new NotFoundException('package_not_found')

    const adults = q.adults ?? q.pax ?? 2
    const childrenAges = q.childrenAges ?? []
    const resolved = await this.resolveDeparture(pkg, q)
    const party = this.priceParty(pkg, resolved, q.occupancy, adults, childrenAges)
    const deposit = depositUsd(party.tourTotalUsd, pkg.catalog_meta)

    const refDate = resolved.info.date ?? `${resolved.info.season}-${resolved.info.nights}n`
    const ref = `LIZCO-${q.packageSlug}-${refDate}`

    return {
      ok: true as const,
      tourId: q.tourId ?? null,
      packageSlug: q.packageSlug,
      pricingModel: pkg.pricing_model,
      departure: resolved.info,
      occupancy: q.occupancy,
      adults,
      childrenAges,
      perAdultUsd: party.perAdultUsd,
      adultsUsd: party.adultsUsd,
      children: party.children,
      childrenUsd: party.childrenUsd,
      tourTotalUsd: party.tourTotalUsd,
      deposit,
      mealPlan: pkg.catalog_meta?.meal_plan ?? null,
      // Compat con el contrato anterior
      travelDate: resolved.info.date,
      paxCount: adults + childrenAges.length,
      perPersonUsd: party.perAdultUsd,
      totalPartyUsd: party.tourTotalUsd,
      boldPrepared: buildBoldCheckoutPayload({
        bookingReference: ref,
        amount: party.perAdultUsd,
        currency: 'USD',
        tourId: q.tourId,
        packageSlug: q.packageSlug,
        travelDateIso: resolved.info.date ?? '',
      }),
    }
  }

  async submit(body: BookingSubmitRequestDto): Promise<BookingSubmitResponseDto> {
    const pkg = await this.repo.packageBySlug(body.packageSlug)
    if (!pkg) throw new NotFoundException('package_not_found')

    // Date-only strings pass through verbatim — toLocalYmd would shift them
    // a day back (UTC parse rendered in local TZ).
    const date = !body.travelDateIso
      ? undefined
      : /^\d{4}-\d{2}-\d{2}$/.test(body.travelDateIso)
        ? body.travelDateIso
        : toLocalYmd(body.travelDateIso)
    const resolved = await this.resolveDeparture(pkg, { ...body, date })

    // Edades exactas → reglas de niños del tarifario; conteo legado sin edades
    // paga tarifa de adulto (regla "Adulto+Niño" del tarifario, conservadora).
    const childrenAges =
      body.childrenAges ?? Array.from({ length: body.children }, () => 17)
    const party = this.priceParty(pkg, resolved, body.occupancy, body.adults, childrenAges)

    // Add-ons del catálogo, sin cambios (computeAddOnsUsdSelected)
    let addOnRows: AddOnRow[]
    try {
      addOnRows = await this.catalog.listAddOnsForPackageSlug(body.packageSlug)
    } catch {
      throw new InternalServerErrorException('add_ons_load_failed')
    }
    const selectedSet = new Set(body.selectedAddOnIds)
    for (const id of body.selectedAddOnIds) {
      if (!addOnRows.some((r) => r.id === id)) {
        throw new BadRequestException('validation_failed')
      }
    }
    const selectedMap: Record<string, boolean> = {}
    for (const row of addOnRows) selectedMap[row.id] = selectedSet.has(row.id)

    const travelerCount = body.adults + childrenAges.length
    const durationDays = Math.max(1, (resolved.info.nights ?? pkg.nights) + 1)
    const addOnsUsd = computeAddOnsUsdSelected(addOnRows, selectedMap, travelerCount, durationDays)
    const totalUsd = Math.round((party.tourTotalUsd + addOnsUsd) * 100) / 100

    const deposit = depositUsd(totalUsd, pkg.catalog_meta)
    const depositDue = body.paymentMode === 'deposit' ? (deposit?.amountUsd ?? null) : null

    const phone = body.guestPhone?.trim() || null
    // CRM legado (enterprise_tours.customers) — se mantiene para atribución
    await this.repo.upsertCustomer({
      first_name: body.guestFirstName.trim(),
      last_name: body.guestLastName.trim(),
      email: body.guestEmail.trim().toLowerCase(),
      phone,
    })

    const addonsSnapshot = addOnRows
      .filter((row) => selectedSet.has(row.id))
      .map((row) => {
        let calculated = 0
        if (row.type === 'PER_BOOKING') calculated = row.price
        else if (row.type === 'PER_PERSON') calculated = row.price * travelerCount
        else if (row.type === 'PER_DAY') calculated = row.price * durationDays
        return {
          id: row.id,
          name: row.name,
          quantity: 1,
          price_usd: Math.round(calculated * 100) / 100,
        }
      })

    const bookingId = await this.repo.createBooking({
      package_id: pkg.id,
      departure_id: resolved.departureId,
      hotel_departure_id: resolved.hotelDepartureId,
      hotel_id: resolved.hotelId,
      room_type: body.occupancy,
      medellin_nights: resolved.medellinNights,
      adults: body.adults,
      children_ages: childrenAges,
      guest_name: `${body.guestFirstName.trim()} ${body.guestLastName.trim()}`,
      guest_email: body.guestEmail.trim().toLowerCase(),
      guest_phone: phone,
      guest_country: body.guestCountry?.trim() || null,
      special_requests: body.specialRequests?.trim() || null,
      total_usd: totalUsd,
      payment_mode: body.paymentMode,
      deposit_usd: depositDue,
      addons_snapshot: addonsSnapshot,
      display_currency: 'USD',
    })

    await this.repo.insertBookingAddons(bookingId, addonsSnapshot)

    return { ok: true as const, bookingId, totalUsd, depositUsd: depositDue }
  }
}
