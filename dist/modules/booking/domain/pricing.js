"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeAddOnsUsdSelected = computeAddOnsUsdSelected;
exports.toLocalYmd = toLocalYmd;
exports.buildBoldCheckoutPayload = buildBoldCheckoutPayload;
function computeAddOnsUsdSelected(addOns, selectedMap, travelerCount, durationDays) {
    let total = 0;
    for (const row of addOns) {
        if (!selectedMap[row.id])
            continue;
        if (row.type === 'PER_BOOKING')
            total += row.price;
        else if (row.type === 'PER_PERSON')
            total += row.price * travelerCount;
        else if (row.type === 'PER_DAY')
            total += row.price * durationDays;
    }
    return Math.round(total * 100) / 100;
}
function toLocalYmd(iso) {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
function buildBoldCheckoutPayload(input) {
    const signature = Buffer.from(`${input.bookingReference}:${input.amount}:${input.currency}:${input.packageSlug}:${input.travelDateIso}`).toString('base64url');
    return { ...input, signature };
}
//# sourceMappingURL=pricing.js.map