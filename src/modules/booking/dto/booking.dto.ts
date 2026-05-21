import { z } from 'zod'
import type { BoldCheckoutPayload } from '../domain/pricing'

export const quoteQuerySchema = z.object({
  packageSlug: z.string().trim().min(1).max(200),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  pax: z.coerce.number().int().min(1).max(50).default(2),
  tourId: z.string().trim().max(200).optional(),
})
export type QuoteQuery = z.infer<typeof quoteQuerySchema>
export type BookingQuoteRequestDto = QuoteQuery

export type BookingQuoteResponseDto = {
  ok: true
  tourId: string | null
  packageSlug: string
  travelDate: string
  paxCount: number
  catalogBaseUsd: number
  multiplier: number
  perPersonUsd: number
  totalPartyUsd: number
  boldPrepared: BoldCheckoutPayload & { signature: string }
}

export const bookingSubmitSchema = z
  .object({
    packageSlug: z.string().trim().min(1).max(200),
    travelDateIso: z.string().trim().min(1).max(40),
    adults: z.coerce.number().int().min(1).max(50),
    children: z.coerce.number().int().min(0).max(50),
    paymentMode: z.enum(['deposit', 'full']),
    guestFirstName: z.string().trim().min(1).max(100),
    guestLastName: z.string().trim().min(1).max(100),
    guestEmail: z.string().trim().email().max(150),
    guestPhone: z.string().trim().max(20).optional().or(z.literal('')),
    selectedAddOnIds: z.array(z.string().min(1).max(64)).max(32),
    captchaToken: z.string().trim().max(4000).optional(),
  })
  .superRefine((val, ctx) => {
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
  })
export type BookingSubmitBody = z.infer<typeof bookingSubmitSchema>
export type BookingSubmitRequestDto = BookingSubmitBody

export type BookingSubmitResponseDto = {
  ok: true
  bookingId: string
  totalUsd: number
}
