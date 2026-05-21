import type { AddOnRow } from '../../catalog/domain/entities/add-on.entity'

export function computeAddOnsUsdSelected(
  addOns: AddOnRow[],
  selectedMap: Record<string, boolean>,
  travelerCount: number,
  durationDays: number,
): number {
  let total = 0
  for (const row of addOns) {
    if (!selectedMap[row.id]) continue
    if (row.type === 'PER_BOOKING') total += row.price
    else if (row.type === 'PER_PERSON') total += row.price * travelerCount
    else if (row.type === 'PER_DAY') total += row.price * durationDays
  }
  return Math.round(total * 100) / 100
}

export function toLocalYmd(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export type BoldCheckoutPayload = {
  bookingReference: string
  amount: number
  currency: 'USD'
  tourId?: string
  packageSlug: string
  travelDateIso: string
}

export function buildBoldCheckoutPayload(input: BoldCheckoutPayload): BoldCheckoutPayload & { signature: string } {
  const signature = Buffer.from(
    `${input.bookingReference}:${input.amount}:${input.currency}:${input.packageSlug}:${input.travelDateIso}`,
  ).toString('base64url')
  return { ...input, signature }
}
