"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingError = void 0;
exports.perAdultUsd = perAdultUsd;
exports.childLineUsd = childLineUsd;
exports.quoteParty = quoteParty;
exports.depositUsd = depositUsd;
class PricingError extends Error {
    code;
    constructor(code) {
        super(code);
        this.code = code;
    }
}
exports.PricingError = PricingError;
const round2 = (n) => Math.round(n * 100) / 100;
function perAdultUsd(row, occupancy) {
    const value = occupancy === 'multiple' ? row.price_multiple_usd :
        occupancy === 'double' ? row.price_double_usd :
            row.price_single_usd;
    if (value === null || value === undefined || !Number.isFinite(Number(value)) || Number(value) <= 0) {
        throw new PricingError(`price_not_published_${occupancy}`);
    }
    return Number(value);
}
function childLineUsd(age, adultUsd, rules) {
    const match = (rules ?? []).find((r) => {
        const min = r.min_age ?? 0;
        const max = r.max_age ?? (r.pays_as_adult ? 200 : null);
        return max !== null && age >= min && age <= max;
    });
    if (!match)
        return { age, amountUsd: round2(adultUsd), rule: 'adult_rate' };
    if (match.pays_as_adult)
        return { age, amountUsd: round2(adultUsd), rule: match.text ?? 'adult_rate' };
    if (match.fixed_usd !== null && match.fixed_usd !== undefined) {
        return { age, amountUsd: round2(match.fixed_usd), rule: match.text ?? `fixed_${match.fixed_usd}` };
    }
    if (match.pct !== null && match.pct !== undefined) {
        return { age, amountUsd: round2((adultUsd * match.pct) / 100), rule: match.text ?? `pct_${match.pct}` };
    }
    return { age, amountUsd: round2(adultUsd), rule: match.text ?? 'adult_rate' };
}
function quoteParty(row, occupancy, adults, childrenAges, meta) {
    const adult = perAdultUsd(row, occupancy);
    const children = childrenAges.map((age) => childLineUsd(age, adult, meta?.child_rules));
    const adultsUsd = round2(adult * adults);
    const childrenUsd = round2(children.reduce((s, c) => s + c.amountUsd, 0));
    return {
        perAdultUsd: adult,
        adults,
        adultsUsd,
        children,
        childrenUsd,
        tourTotalUsd: round2(adultsUsd + childrenUsd),
    };
}
function depositUsd(totalUsd, meta) {
    const pct = meta?.deposit_pct;
    if (pct === null || pct === undefined || !Number.isFinite(Number(pct)) || Number(pct) <= 0)
        return null;
    return { pct: Number(pct), amountUsd: round2((totalUsd * Number(pct)) / 100) };
}
//# sourceMappingURL=departure-pricing.js.map