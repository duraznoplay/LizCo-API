import {
  childLineUsd,
  depositUsd,
  perAdultUsd,
  PricingError,
  quoteParty,
  type CatalogMeta,
} from './departure-pricing'

// Filas reales del tarifario (others/Lizco.xlsx) — los precios son el contrato.
const SANTA_MARTA_SAN_FRANCISCO_MAR20 = {
  price_multiple_usd: 555,
  price_double_usd: 600,
  price_single_usd: 805,
}

const BOYACA_FEB19_PROMO = {
  price_multiple_usd: 545,
  price_double_usd: 655,
  price_single_usd: 945,
}

const MEDELLIN_RADIX_3N_LOW = {
  price_multiple_usd: 345,
  price_double_usd: 385,
  price_single_usd: null, // "Single accommodation: confirm with advisor"
}

const SANTA_MARTA_META: CatalogMeta = {
  deposit_pct: 40,
  meal_plan: 'PAM',
  child_rules: [
    { text: 'Ninos 0-23 meses pagan seguro de viaje 35 USD', min_age: 0, max_age: 1, pct: null, fixed_usd: 35 },
    { text: 'Ninos 2-3 anos pagan tiquete aereo y asistencia medica 60% del valor del plan', min_age: 2, max_age: 3, pct: 60, fixed_usd: null },
    { text: 'Ninos 4-10 anos validar con el asesor de acuerdo al hotel', min_age: 4, max_age: 10, pct: null, fixed_usd: null },
    { text: 'A partir de 11 anos cancela como adulto', min_age: 11, max_age: null, pct: null, fixed_usd: null, pays_as_adult: true },
  ],
}

describe('perAdultUsd — precio exacto del Excel por ocupación', () => {
  it('devuelve el precio publicado para cada ocupación (Santa Marta MARZO 20)', () => {
    expect(perAdultUsd(SANTA_MARTA_SAN_FRANCISCO_MAR20, 'multiple')).toBe(555)
    expect(perAdultUsd(SANTA_MARTA_SAN_FRANCISCO_MAR20, 'double')).toBe(600)
    expect(perAdultUsd(SANTA_MARTA_SAN_FRANCISCO_MAR20, 'single')).toBe(805)
  })

  it('rechaza ocupaciones no publicadas (Medellín sencilla = on request)', () => {
    expect(() => perAdultUsd(MEDELLIN_RADIX_3N_LOW, 'single')).toThrow(PricingError)
    expect(() => perAdultUsd(MEDELLIN_RADIX_3N_LOW, 'single')).toThrow('price_not_published_single')
  })
})

describe('childLineUsd — reglas de niños de catalog_meta', () => {
  it('bebés 0-23 meses pagan tarifa fija (35 USD)', () => {
    const line = childLineUsd(1, 555, SANTA_MARTA_META.child_rules)
    expect(line.amountUsd).toBe(35)
  })

  it('niños 2-3 años pagan 60% del plan', () => {
    const line = childLineUsd(3, 555, SANTA_MARTA_META.child_rules)
    expect(line.amountUsd).toBe(333) // 555 × 0.60
  })

  it('rango sin números ("validar con asesor") cobra tarifa adulto, conservador', () => {
    const line = childLineUsd(7, 555, SANTA_MARTA_META.child_rules)
    expect(line.amountUsd).toBe(555)
    expect(line.rule).toContain('validar')
  })

  it('desde 11 años cancela como adulto', () => {
    expect(childLineUsd(12, 555, SANTA_MARTA_META.child_rules).amountUsd).toBe(555)
  })

  it('sin reglas → tarifa adulto', () => {
    expect(childLineUsd(5, 600, undefined).amountUsd).toBe(600)
  })
})

describe('quoteParty — total del grupo sin números mágicos', () => {
  it('2 adultos doble Boyacá PROMO = 2 × 655', () => {
    const party = quoteParty(BOYACA_FEB19_PROMO, 'double', 2, [], null)
    expect(party.perAdultUsd).toBe(655)
    expect(party.tourTotalUsd).toBe(1310)
  })

  it('2 adultos + bebé + niño de 3 años en múltiple (Santa Marta)', () => {
    const party = quoteParty(SANTA_MARTA_SAN_FRANCISCO_MAR20, 'multiple', 2, [1, 3], SANTA_MARTA_META)
    expect(party.adultsUsd).toBe(1110) // 2 × 555
    expect(party.childrenUsd).toBe(368) // 35 + 333
    expect(party.tourTotalUsd).toBe(1478)
  })
})

describe('depositUsd — depósito automático desde catalog_meta', () => {
  it('40% Santa Marta', () => {
    expect(depositUsd(1478, SANTA_MARTA_META)).toEqual({ pct: 40, amountUsd: 591.2 })
  })

  it('null cuando el tarifario no define depósito', () => {
    expect(depositUsd(1000, null)).toBeNull()
    expect(depositUsd(1000, { deposit_pct: null })).toBeNull()
  })
})
