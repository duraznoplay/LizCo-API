import { z } from 'zod'
import type { BoldCheckoutPayload } from '../domain/pricing'
import type { ChildQuoteLine, Occupancy, PricingModel } from '../domain/departure-pricing'

const ymd = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD')
const uuid = z.string().trim().uuid()

/** "5,8" → [5, 8] (quote query). Submit uses a plain array. */
const childrenAgesCsv = z
  .string()
  .trim()
  .max(200)
  .transform((s) => (s ? s.split(',').map((x) => Number(x.trim())) : []))
  .pipe(z.array(z.number().int().min(0).max(17)).max(20))

export const quoteQuerySchema = z
  .object({
    packageSlug: z.string().trim().min(1).max(200),
    /** Salida concreta: package_departures.id | hotel_departures.id | medellin_price_grid.id */
    departureId: uuid.optional(),
    date: ymd.optional(),
    /** Desambigua salidas dobles (p. ej. Eje Cafetero 29-dic con dos regresos) */
    returnDate: ymd.optional(),
    /** hotel_based: requerido junto a date; hotel_season: siempre requerido */
    hotelId: uuid.optional(),
    occupancy: z.enum(['multiple', 'double', 'single']).default('multiple'),
    adults: z.coerce.number().int().min(1).max(50).optional(),
    /** Compat: alias legado de adults */
    pax: z.coerce.number().int().min(1).max(50).optional(),
    childrenAges: childrenAgesCsv.optional(),
    /** hotel_season (Medellín) */
    nights: z.coerce.number().int().refine((n) => n === 3 || n === 4, 'nights must be 3 or 4').optional(),
    season: z.enum(['regular', 'alta']).optional(),
    tourId: z.string().trim().max(200).optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.departureId && !val.date && !(val.hotelId && val.nights && val.season)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'departureId, date, or (hotelId + nights + season) is required',
        path: ['departureId'],
      })
    }
  })
export type QuoteQuery = z.infer<typeof quoteQuerySchema>
export type BookingQuoteRequestDto = QuoteQuery

export type QuoteDepartureInfo = {
  id: string | null
  date: string | null
  returnDate: string | null
  hotelId: string | null
  hotelName: string | null
  season: string | null
  nights: number | null
  label: string | null
  availableSpots: number | null
}

export type BookingQuoteResponseDto = {
  ok: true
  tourId: string | null
  packageSlug: string
  pricingModel: PricingModel
  departure: QuoteDepartureInfo
  occupancy: Occupancy
  adults: number
  childrenAges: number[]
  perAdultUsd: number
  adultsUsd: number
  children: ChildQuoteLine[]
  childrenUsd: number
  tourTotalUsd: number
  deposit: { pct: number; amountUsd: number } | null
  mealPlan: string | null
  /** Compat con consumidores del contrato anterior */
  travelDate: string | null
  paxCount: number
  perPersonUsd: number
  totalPartyUsd: number
  boldPrepared: BoldCheckoutPayload & { signature: string }
}

export const bookingSubmitSchema = z
  .object({
    packageSlug: z.string().trim().min(1).max(200),
    departureId: uuid.optional(),
    travelDateIso: z.string().trim().min(1).max(40).optional(),
    returnDate: ymd.optional(),
    hotelId: uuid.optional(),
    occupancy: z.enum(['multiple', 'double', 'single']).default('multiple'),
    nights: z.coerce.number().int().refine((n) => n === 3 || n === 4, 'nights must be 3 or 4').optional(),
    season: z.enum(['regular', 'alta']).optional(),
    adults: z.coerce.number().int().min(1).max(50),
    /** Edades exactas → reglas de niños del tarifario; sin edades pagan tarifa adulto */
    childrenAges: z.array(z.coerce.number().int().min(0).max(17)).max(20).optional(),
    /** Compat: conteo legado (sin edades) */
    children: z.coerce.number().int().min(0).max(50).default(0),
    paymentMode: z.enum(['deposit', 'full']),
    guestFirstName: z.string().trim().min(1).max(100),
    guestLastName: z.string().trim().min(1).max(100),
    guestEmail: z.string().trim().email().max(150),
    guestPhone: z.string().trim().max(20).optional().or(z.literal('')),
    guestCountry: z.string().trim().max(80).optional(),
    specialRequests: z.string().trim().max(2000).optional(),
    selectedAddOnIds: z.array(z.string().min(1).max(64)).max(32),
    captchaToken: z.string().trim().max(4000).optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.departureId && !val.travelDateIso && !(val.hotelId && val.nights && val.season)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'departureId, travelDateIso, or (hotelId + nights + season) is required',
        path: ['departureId'],
      })
      return
    }
    if (val.travelDateIso) {
      const d = new Date(val.travelDateIso)
      if (Number.isNaN(d.getTime())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid travel date', path: ['travelDateIso'] })
        return
      }
      const travel = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      if (travel < today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Travel date cannot be in the past',
          path: ['travelDateIso'],
        })
      }
    }
  })
export type BookingSubmitBody = z.infer<typeof bookingSubmitSchema>
export type BookingSubmitRequestDto = BookingSubmitBody

export type BookingSubmitResponseDto = {
  ok: true
  bookingId: string
  totalUsd: number
  depositUsd: number | null
}
