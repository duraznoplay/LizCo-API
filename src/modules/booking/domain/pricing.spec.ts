import type { AddOnRow } from '../../catalog/domain/entities/add-on.entity'
import { buildBoldCheckoutPayload, computeAddOnsUsdSelected, toLocalYmd } from './pricing'

describe('pricing helpers', () => {
  const addOns: AddOnRow[] = [
    { id: 'a', name: 'A', type: 'PER_BOOKING', price: 50, is_active: true },
    { id: 'b', name: 'B', type: 'PER_PERSON', price: 20, is_active: true },
    { id: 'c', name: 'C', type: 'PER_DAY', price: 10, is_active: true },
  ]

  it('computes PER_BOOKING only when selected', () => {
    expect(
      computeAddOnsUsdSelected(addOns, { a: true, b: false, c: false }, 3, 4),
    ).toBe(50)
  })

  it('scales PER_PERSON by travelers', () => {
    expect(
      computeAddOnsUsdSelected(addOns, { a: false, b: true, c: false }, 3, 4),
    ).toBe(60)
  })

  it('scales PER_DAY by duration', () => {
    expect(
      computeAddOnsUsdSelected(addOns, { a: false, b: false, c: true }, 3, 4),
    ).toBe(40)
  })

  it('sums all types correctly', () => {
    expect(
      computeAddOnsUsdSelected(addOns, { a: true, b: true, c: true }, 3, 4),
    ).toBe(50 + 60 + 40)
  })

  it('toLocalYmd formats ISO date to YYYY-MM-DD', () => {
    const ymd = toLocalYmd('2026-06-15T08:00:00.000Z')
    expect(ymd).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('buildBoldCheckoutPayload attaches deterministic signature', () => {
    const payload = buildBoldCheckoutPayload({
      bookingReference: 'LIZCO-x-2026-06-01',
      amount: 123.45,
      currency: 'USD',
      packageSlug: 'x',
      travelDateIso: '2026-06-01',
    })
    expect(typeof payload.signature).toBe('string')
    expect(payload.signature.length).toBeGreaterThan(10)
  })
})
