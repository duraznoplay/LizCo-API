import {
  BadRequestException,
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
} from './dto/booking.dto'
import { BookingRepository } from './booking.repository'
import { buildBoldCheckoutPayload, computeAddOnsUsdSelected, toLocalYmd } from './domain/pricing'

@Injectable()
export class BookingService {
  private readonly log = new Logger(BookingService.name)

  constructor(
    private readonly repo: BookingRepository,
    private readonly catalog: CatalogService,
  ) {}

  async quote(q: BookingQuoteRequestDto): Promise<BookingQuoteResponseDto> {
    const pkg = await this.repo.packageBySlug(q.packageSlug)
    if (!pkg) throw new NotFoundException('package_not_found')

    const base = Number(pkg.base_price)
    if (!Number.isFinite(base) || base <= 0) {
      throw new BadRequestException('invalid_package_price')
    }

    let total: number
    try {
      total = await this.repo.calculatePartyTotal({
        packageId: pkg.id,
        travelDate: q.date,
        paxCount: q.pax,
      })
    } catch {
      throw new InternalServerErrorException('pricing_unavailable')
    }

    const perPersonUsd = Math.round((total / q.pax) * 100) / 100
    const multiplier = base > 0 ? Math.round((perPersonUsd / base) * 10000) / 10000 : 1
    const ref = `LIZCO-${q.packageSlug}-${q.date}`

    return {
      ok: true as const,
      tourId: q.tourId ?? null,
      packageSlug: q.packageSlug,
      travelDate: q.date,
      paxCount: q.pax,
      catalogBaseUsd: base,
      multiplier,
      perPersonUsd,
      totalPartyUsd: total,
      boldPrepared: buildBoldCheckoutPayload({
        bookingReference: ref,
        amount: perPersonUsd,
        currency: 'USD',
        tourId: q.tourId,
        packageSlug: q.packageSlug,
        travelDateIso: q.date,
      }),
    }
  }

  async submit(body: BookingSubmitRequestDto): Promise<BookingSubmitResponseDto> {
    const pkg = await this.repo.packageBySlug(body.packageSlug)
    if (!pkg) throw new NotFoundException('package_not_found')

    const basePrice = Number(pkg.base_price)
    if (!Number.isFinite(basePrice) || basePrice <= 0) {
      throw new BadRequestException('invalid_package_price')
    }

    const ymd = toLocalYmd(body.travelDateIso)
    let adultsPartyTotal: number
    try {
      adultsPartyTotal = await this.repo.calculatePartyTotal({
        packageId: pkg.id,
        travelDate: ymd,
        paxCount: body.adults,
      })
    } catch {
      throw new InternalServerErrorException('pricing_unavailable')
    }

    const perPerson = body.adults > 0 ? adultsPartyTotal / body.adults : 0
    const childrenPortion = perPerson * 0.7 * body.children
    const tourUsd = adultsPartyTotal + childrenPortion
    const multiplier = basePrice > 0 ? Math.round((perPerson / basePrice) * 10000) / 10000 : 1

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

    const travelerCount = body.adults + body.children
    const durationDays = Math.max(1, Number(pkg.duration_days) || 4)
    const addOnsUsd = computeAddOnsUsdSelected(addOnRows, selectedMap, travelerCount, durationDays)
    const totalUsd = Math.round((tourUsd + addOnsUsd) * 100) / 100
    const phone = body.guestPhone?.trim() || null

    const customerId = await this.repo.upsertCustomer({
      first_name: body.guestFirstName.trim(),
      last_name: body.guestLastName.trim(),
      email: body.guestEmail.trim().toLowerCase(),
      phone,
    })

    const selectedAddOns = addOnRows
      .filter((row) => selectedSet.has(row.id))
      .map((row) => {
        let calculated = 0
        if (row.type === 'PER_BOOKING') calculated = row.price
        else if (row.type === 'PER_PERSON') calculated = row.price * travelerCount
        else if (row.type === 'PER_DAY') calculated = row.price * durationDays
        return {
          id: row.id,
          quantity: 1,
          price: Math.round(calculated * 100) / 100,
        }
      })

    const bookingId = await this.repo.createBookingWithAddOns({
      package_id: pkg.id,
      customer_id: customerId,
      travel_date: ymd,
      travelers_count: travelerCount,
      base_price_applied: basePrice,
      season_multiplier_applied: multiplier,
      total_calculated_price: totalUsd,
      addOns: selectedAddOns,
    })

    return { ok: true as const, bookingId, totalUsd }
  }
}
