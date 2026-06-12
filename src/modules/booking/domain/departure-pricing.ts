/**
 * Exact-price resolution for the Model B catalog (FASE 4).
 *
 * The quote NEVER derives prices (no season × occupancy math): every figure
 * comes verbatim from the imported tarifario rows
 * (package_departures / hotel_departures / medellin_price_grid) plus the
 * structured business rules in tour_packages.catalog_meta.
 * See LizCo Global Tours/docs/ADR-modelo-canonico-booking.md.
 */

export type PricingModel = 'standard' | 'hotel_based' | 'hotel_season'
export type Occupancy = 'multiple' | 'double' | 'single'

export interface PriceRow {
  price_multiple_usd: number | null
  price_double_usd: number | null
  price_single_usd: number | null
}

export interface ChildRule {
  text?: string
  text_en?: string | null
  min_age: number | null
  max_age: number | null
  pct: number | null
  fixed_usd: number | null
  pays_as_adult?: boolean
}

export interface CatalogMeta {
  deposit_pct?: number | null
  child_rules?: ChildRule[]
  meal_plan?: string | null
  supplements?: { double_usd?: number | null; single_pct?: number | null } | null
}

export class PricingError extends Error {
  constructor(public readonly code: string) {
    super(code)
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Per-adult price for the chosen occupancy, straight from the tarifario row. */
export function perAdultUsd(row: PriceRow, occupancy: Occupancy): number {
  const value =
    occupancy === 'multiple' ? row.price_multiple_usd :
    occupancy === 'double' ? row.price_double_usd :
    row.price_single_usd
  if (value === null || value === undefined || !Number.isFinite(Number(value)) || Number(value) <= 0) {
    // e.g. Medellín single: "confirm with advisor" — never invented
    throw new PricingError(`price_not_published_${occupancy}`)
  }
  return Number(value)
}

export interface ChildQuoteLine {
  age: number
  amountUsd: number
  rule: string
}

/**
 * Applies catalog_meta.child_rules per child age.
 * fixed_usd wins, then pct of the adult rate, then pays_as_adult.
 * Ages without a parseable rule pay the adult rate (conservative; the rule
 * text — "validar con el asesor" — is surfaced on the quote).
 */
export function childLineUsd(age: number, adultUsd: number, rules: ChildRule[] | undefined): ChildQuoteLine {
  const match = (rules ?? []).find((r) => {
    const min = r.min_age ?? 0
    const max = r.max_age ?? (r.pays_as_adult ? 200 : null)
    return max !== null && age >= min && age <= max
  })
  if (!match) return { age, amountUsd: round2(adultUsd), rule: 'adult_rate' }
  if (match.pays_as_adult) return { age, amountUsd: round2(adultUsd), rule: match.text ?? 'adult_rate' }
  if (match.fixed_usd !== null && match.fixed_usd !== undefined) {
    return { age, amountUsd: round2(match.fixed_usd), rule: match.text ?? `fixed_${match.fixed_usd}` }
  }
  if (match.pct !== null && match.pct !== undefined) {
    return { age, amountUsd: round2((adultUsd * match.pct) / 100), rule: match.text ?? `pct_${match.pct}` }
  }
  return { age, amountUsd: round2(adultUsd), rule: match.text ?? 'adult_rate' }
}

export interface PartyQuote {
  perAdultUsd: number
  adults: number
  adultsUsd: number
  children: ChildQuoteLine[]
  childrenUsd: number
  tourTotalUsd: number
}

export function quoteParty(
  row: PriceRow,
  occupancy: Occupancy,
  adults: number,
  childrenAges: number[],
  meta: CatalogMeta | null,
): PartyQuote {
  const adult = perAdultUsd(row, occupancy)
  const children = childrenAges.map((age) => childLineUsd(age, adult, meta?.child_rules))
  const adultsUsd = round2(adult * adults)
  const childrenUsd = round2(children.reduce((s, c) => s + c.amountUsd, 0))
  return {
    perAdultUsd: adult,
    adults,
    adultsUsd,
    children,
    childrenUsd,
    tourTotalUsd: round2(adultsUsd + childrenUsd),
  }
}

/** Deposit from catalog_meta.deposit_pct (e.g. 40% Santa Marta/Cartagena). */
export function depositUsd(totalUsd: number, meta: CatalogMeta | null): { pct: number; amountUsd: number } | null {
  const pct = meta?.deposit_pct
  if (pct === null || pct === undefined || !Number.isFinite(Number(pct)) || Number(pct) <= 0) return null
  return { pct: Number(pct), amountUsd: round2((totalUsd * Number(pct)) / 100) }
}
