import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { BookingService } from './booking.service'
import type { BookingRepository } from './booking.repository'
import type { CatalogService } from '../catalog/catalog.service'

/**
 * Unit tests del flujo de cotización contra el Modelo B con precios reales
 * del tarifario (un caso por cada pricing_model). Repo mockeado.
 */

const PKG_STANDARD = {
  id: 'pkg-boyaca',
  slug: 'boyaca-colombia',
  name: 'Boyacá Explorer',
  pricing_model: 'standard' as const,
  nights: 4,
  catalog_meta: {
    deposit_pct: null,
    child_rules: [
      { text: 'Children under 2 years pay only 25 USD', min_age: 0, max_age: 1, pct: null, fixed_usd: 25 },
      { text: 'Children 2-9 years pay 90% of tour value', min_age: 2, max_age: 9, pct: 90, fixed_usd: null },
    ],
  },
}

const PKG_HOTEL = {
  id: 'pkg-sm',
  slug: 'santa-marta-colombia',
  name: 'Santa Marta',
  pricing_model: 'hotel_based' as const,
  nights: 3,
  catalog_meta: { deposit_pct: 40, meal_plan: 'PAM', child_rules: [] },
}

const PKG_MEDELLIN = {
  id: 'pkg-med',
  slug: 'medellin-colombia',
  name: 'Medellín',
  pricing_model: 'hotel_season' as const,
  nights: 3,
  catalog_meta: { deposit_pct: null, child_rules: [] },
}

// Filas con precios verbatim del Excel
const DEP_BOYACA_PROMO = {
  id: 'dep-1',
  package_id: 'pkg-boyaca',
  departure_date: '2026-02-19',
  return_date: '2026-02-23',
  price_multiple_usd: 545,
  price_double_usd: 655,
  price_single_usd: 945,
  season: 'regular',
  price_type: 'promo',
  label: 'PROMO',
  available_spots: null,
  is_active: true,
}

const DEP_SM_SANFRAN_MAR20 = {
  id: 'hdep-1',
  hotel_id: 'hotel-sf',
  departure_date: '2026-03-20',
  return_date: '2026-03-23',
  price_multiple_usd: 555,
  price_double_usd: 600,
  price_single_usd: 805,
  season: 'alta',
  label: null,
  available_spots: null,
  is_active: true,
}

const CELL_RADIX_3N_LOW = {
  id: 'cell-1',
  hotel_id: 'hotel-radix',
  season: 'regular',
  nights: 3,
  price_multiple_usd: 345,
  price_double_usd: 385,
  is_active: true,
}

function makeService(repoOverrides: Partial<Record<keyof BookingRepository, unknown>>) {
  const repo = {
    packageBySlug: jest.fn(),
    standardDepartureById: jest.fn(),
    standardDeparturesByDate: jest.fn().mockResolvedValue([]),
    hotelDepartureById: jest.fn(),
    hotelDepartureByKey: jest.fn(),
    medellinCellById: jest.fn(),
    medellinCellByKey: jest.fn(),
    hotelById: jest.fn(),
    createBooking: jest.fn().mockResolvedValue('booking-1'),
    insertBookingAddons: jest.fn().mockResolvedValue(undefined),
    upsertCustomer: jest.fn().mockResolvedValue('cust-1'),
    ...repoOverrides,
  } as unknown as BookingRepository
  const catalog = {
    listAddOnsForPackageSlug: jest.fn().mockResolvedValue([
      { id: 'A1', name: 'Transporte privado', type: 'PER_BOOKING', price: 50, is_active: true },
      { id: 'A2', name: 'Seguro médico', type: 'PER_PERSON', price: 15, is_active: true },
    ]),
  } as unknown as CatalogService
  return { svc: new BookingService(repo, catalog), repo, catalog }
}

describe('BookingService.quote — precio exacto del Excel por pricing_model', () => {
  it('standard: Boyacá 2026-02-19 PROMO doble = 655 USD por adulto', async () => {
    const { svc } = makeService({
      packageBySlug: jest.fn().mockResolvedValue(PKG_STANDARD),
      standardDeparturesByDate: jest.fn().mockResolvedValue([DEP_BOYACA_PROMO]),
    })
    const res = await svc.quote({
      packageSlug: 'boyaca-colombia',
      date: '2026-02-19',
      occupancy: 'double',
      adults: 2,
    } as never)
    expect(res.pricingModel).toBe('standard')
    expect(res.perAdultUsd).toBe(655)
    expect(res.tourTotalUsd).toBe(1310)
    expect(res.departure.label).toBe('PROMO')
    expect(res.deposit).toBeNull()
  })

  it('standard: aplica reglas de niños (2-9 años → 90%)', async () => {
    const { svc } = makeService({
      packageBySlug: jest.fn().mockResolvedValue(PKG_STANDARD),
      standardDeparturesByDate: jest.fn().mockResolvedValue([DEP_BOYACA_PROMO]),
    })
    const res = await svc.quote({
      packageSlug: 'boyaca-colombia',
      date: '2026-02-19',
      occupancy: 'multiple',
      adults: 2,
      childrenAges: [5, 1],
    } as never)
    expect(res.adultsUsd).toBe(1090) // 2 × 545
    expect(res.childrenUsd).toBe(515.5) // 545×0.9 + 25
    expect(res.tourTotalUsd).toBe(1605.5)
  })

  it('hotel_based: Santa Marta MARZO 20 San Francisco = 555/600/805', async () => {
    const { svc } = makeService({
      packageBySlug: jest.fn().mockResolvedValue(PKG_HOTEL),
      hotelDepartureByKey: jest.fn().mockResolvedValue(DEP_SM_SANFRAN_MAR20),
      hotelById: jest.fn().mockResolvedValue({
        id: 'hotel-sf', package_id: 'pkg-sm', name: 'Hotel San Francisco', meal_plan: 'PAM', is_active: true,
      }),
    })
    for (const [occupancy, expected] of [['multiple', 555], ['double', 600], ['single', 805]] as const) {
      const res = await svc.quote({
        packageSlug: 'santa-marta-colombia',
        date: '2026-03-20',
        hotelId: 'hotel-sf',
        occupancy,
        adults: 1,
      } as never)
      expect(res.perAdultUsd).toBe(expected)
    }
  })

  it('hotel_based: incluye depósito 40% del catalog_meta', async () => {
    const { svc } = makeService({
      packageBySlug: jest.fn().mockResolvedValue(PKG_HOTEL),
      hotelDepartureByKey: jest.fn().mockResolvedValue(DEP_SM_SANFRAN_MAR20),
      hotelById: jest.fn().mockResolvedValue({
        id: 'hotel-sf', package_id: 'pkg-sm', name: 'Hotel San Francisco', meal_plan: 'PAM', is_active: true,
      }),
    })
    const res = await svc.quote({
      packageSlug: 'santa-marta-colombia',
      date: '2026-03-20',
      hotelId: 'hotel-sf',
      occupancy: 'multiple',
      adults: 2,
    } as never)
    expect(res.tourTotalUsd).toBe(1110)
    expect(res.deposit).toEqual({ pct: 40, amountUsd: 444 })
  })

  it('hotel_season: Medellín RADIX 3N temporada baja = 345 múltiple / 385 doble', async () => {
    const { svc } = makeService({
      packageBySlug: jest.fn().mockResolvedValue(PKG_MEDELLIN),
      medellinCellByKey: jest.fn().mockResolvedValue(CELL_RADIX_3N_LOW),
      hotelById: jest.fn().mockResolvedValue({
        id: 'hotel-radix', package_id: 'pkg-med', name: 'RADIX', meal_plan: null, is_active: true,
      }),
    })
    const res = await svc.quote({
      packageSlug: 'medellin-colombia',
      hotelId: 'hotel-radix',
      nights: 3,
      season: 'regular',
      occupancy: 'double',
      adults: 2,
    } as never)
    expect(res.perAdultUsd).toBe(385)
    expect(res.tourTotalUsd).toBe(770)
    expect(res.departure.nights).toBe(3)
  })

  it('hotel_season: sencilla no publicada → 400 price_not_published_single', async () => {
    const { svc } = makeService({
      packageBySlug: jest.fn().mockResolvedValue(PKG_MEDELLIN),
      medellinCellByKey: jest.fn().mockResolvedValue(CELL_RADIX_3N_LOW),
      hotelById: jest.fn().mockResolvedValue({
        id: 'hotel-radix', package_id: 'pkg-med', name: 'RADIX', meal_plan: null, is_active: true,
      }),
    })
    await expect(
      svc.quote({
        packageSlug: 'medellin-colombia',
        hotelId: 'hotel-radix',
        nights: 3,
        season: 'regular',
        occupancy: 'single',
        adults: 1,
      } as never),
    ).rejects.toThrow(BadRequestException)
  })

  it('standard: fecha con dos salidas y sin returnDate → 409 ambiguous_departure', async () => {
    const { svc } = makeService({
      packageBySlug: jest.fn().mockResolvedValue(PKG_STANDARD),
      standardDeparturesByDate: jest.fn().mockResolvedValue([
        DEP_BOYACA_PROMO,
        { ...DEP_BOYACA_PROMO, id: 'dep-2', return_date: '2026-02-24', price_multiple_usd: 585 },
      ]),
    })
    await expect(
      svc.quote({ packageSlug: 'boyaca-colombia', date: '2026-02-19', occupancy: 'multiple', adults: 1 } as never),
    ).rejects.toThrow(ConflictException)
  })

  it('404 cuando la salida no existe o está inactiva', async () => {
    const { svc } = makeService({
      packageBySlug: jest.fn().mockResolvedValue(PKG_STANDARD),
      standardDeparturesByDate: jest.fn().mockResolvedValue([]),
    })
    await expect(
      svc.quote({ packageSlug: 'boyaca-colombia', date: '2030-01-01', occupancy: 'multiple', adults: 1 } as never),
    ).rejects.toThrow(NotFoundException)
  })
})

describe('BookingService.submit — reserva en public.bookings (Modelo B)', () => {
  it('crea la reserva con snapshot de precio exacto + add-ons', async () => {
    const createBooking = jest.fn().mockResolvedValue('booking-99')
    const { svc } = makeService({
      packageBySlug: jest.fn().mockResolvedValue(PKG_HOTEL),
      hotelDepartureByKey: jest.fn().mockResolvedValue(DEP_SM_SANFRAN_MAR20),
      hotelById: jest.fn().mockResolvedValue({
        id: 'hotel-sf', package_id: 'pkg-sm', name: 'Hotel San Francisco', meal_plan: 'PAM', is_active: true,
      }),
      createBooking,
    })
    const res = await svc.submit({
      packageSlug: 'santa-marta-colombia',
      travelDateIso: '2026-03-20T00:00:00',
      hotelId: 'hotel-sf',
      occupancy: 'double',
      adults: 2,
      children: 0,
      paymentMode: 'deposit',
      guestFirstName: 'Ana',
      guestLastName: 'Pérez',
      guestEmail: 'ana@example.com',
      guestPhone: '',
      selectedAddOnIds: ['A2'], // Seguro 15 USD × 2 pax = 30
    } as never)

    // 2 × 600 + 30 = 1230; depósito 40% = 492
    expect(res.totalUsd).toBe(1230)
    expect(res.depositUsd).toBe(492)
    expect(createBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        package_id: 'pkg-sm',
        hotel_departure_id: 'hdep-1',
        hotel_id: 'hotel-sf',
        room_type: 'double',
        total_usd: 1230,
        payment_mode: 'deposit',
        deposit_usd: 492,
        addons_snapshot: [expect.objectContaining({ id: 'A2', price_usd: 30 })],
      }),
    )
  })

  it('mapea no_availability del trigger de inventario a 409 (anti-overbooking)', async () => {
    const { svc } = makeService({
      packageBySlug: jest.fn().mockResolvedValue(PKG_HOTEL),
      hotelDepartureByKey: jest.fn().mockResolvedValue(DEP_SM_SANFRAN_MAR20),
      hotelById: jest.fn().mockResolvedValue({
        id: 'hotel-sf', package_id: 'pkg-sm', name: 'Hotel San Francisco', meal_plan: 'PAM', is_active: true,
      }),
      createBooking: jest.fn().mockRejectedValue(new Error('no_availability')),
    })
    await expect(
      svc.submit({
        packageSlug: 'santa-marta-colombia',
        travelDateIso: '2026-08-21',
        hotelId: 'hotel-sf',
        occupancy: 'multiple',
        adults: 4,
        children: 0,
        paymentMode: 'full',
        guestFirstName: 'Over',
        guestLastName: 'Booking',
        guestEmail: 'over@example.com',
        selectedAddOnIds: [],
      } as never),
    ).rejects.toThrow(ConflictException)
  })

  it('rechaza add-ons que no pertenecen al paquete', async () => {
    const { svc } = makeService({
      packageBySlug: jest.fn().mockResolvedValue(PKG_HOTEL),
      hotelDepartureByKey: jest.fn().mockResolvedValue(DEP_SM_SANFRAN_MAR20),
      hotelById: jest.fn().mockResolvedValue({
        id: 'hotel-sf', package_id: 'pkg-sm', name: 'Hotel San Francisco', meal_plan: 'PAM', is_active: true,
      }),
    })
    await expect(
      svc.submit({
        packageSlug: 'santa-marta-colombia',
        travelDateIso: '2026-03-20T00:00:00',
        hotelId: 'hotel-sf',
        occupancy: 'multiple',
        adults: 1,
        children: 0,
        paymentMode: 'full',
        guestFirstName: 'Ana',
        guestLastName: 'Pérez',
        guestEmail: 'ana@example.com',
        selectedAddOnIds: ['NO-EXISTE'],
      } as never),
    ).rejects.toThrow(BadRequestException)
  })
})
