"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var BookingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingService = void 0;
const common_1 = require("@nestjs/common");
const catalog_service_1 = require("../catalog/catalog.service");
const booking_repository_1 = require("./booking.repository");
const pricing_1 = require("./domain/pricing");
let BookingService = BookingService_1 = class BookingService {
    repo;
    catalog;
    log = new common_1.Logger(BookingService_1.name);
    constructor(repo, catalog) {
        this.repo = repo;
        this.catalog = catalog;
    }
    async quote(q) {
        const pkg = await this.repo.packageBySlug(q.packageSlug);
        if (!pkg)
            throw new common_1.NotFoundException('package_not_found');
        const base = Number(pkg.base_price);
        if (!Number.isFinite(base) || base <= 0) {
            throw new common_1.BadRequestException('invalid_package_price');
        }
        let total;
        try {
            total = await this.repo.calculatePartyTotal({
                packageId: pkg.id,
                travelDate: q.date,
                paxCount: q.pax,
            });
        }
        catch {
            throw new common_1.InternalServerErrorException('pricing_unavailable');
        }
        const perPersonUsd = Math.round((total / q.pax) * 100) / 100;
        const multiplier = base > 0 ? Math.round((perPersonUsd / base) * 10000) / 10000 : 1;
        const ref = `LIZCO-${q.packageSlug}-${q.date}`;
        return {
            ok: true,
            tourId: q.tourId ?? null,
            packageSlug: q.packageSlug,
            travelDate: q.date,
            paxCount: q.pax,
            catalogBaseUsd: base,
            multiplier,
            perPersonUsd,
            totalPartyUsd: total,
            boldPrepared: (0, pricing_1.buildBoldCheckoutPayload)({
                bookingReference: ref,
                amount: perPersonUsd,
                currency: 'USD',
                tourId: q.tourId,
                packageSlug: q.packageSlug,
                travelDateIso: q.date,
            }),
        };
    }
    async submit(body) {
        const pkg = await this.repo.packageBySlug(body.packageSlug);
        if (!pkg)
            throw new common_1.NotFoundException('package_not_found');
        const basePrice = Number(pkg.base_price);
        if (!Number.isFinite(basePrice) || basePrice <= 0) {
            throw new common_1.BadRequestException('invalid_package_price');
        }
        const ymd = (0, pricing_1.toLocalYmd)(body.travelDateIso);
        let adultsPartyTotal;
        try {
            adultsPartyTotal = await this.repo.calculatePartyTotal({
                packageId: pkg.id,
                travelDate: ymd,
                paxCount: body.adults,
            });
        }
        catch {
            throw new common_1.InternalServerErrorException('pricing_unavailable');
        }
        const perPerson = body.adults > 0 ? adultsPartyTotal / body.adults : 0;
        const childrenPortion = perPerson * 0.7 * body.children;
        const tourUsd = adultsPartyTotal + childrenPortion;
        const multiplier = basePrice > 0 ? Math.round((perPerson / basePrice) * 10000) / 10000 : 1;
        let addOnRows;
        try {
            addOnRows = await this.catalog.listAddOnsForPackageSlug(body.packageSlug);
        }
        catch {
            throw new common_1.InternalServerErrorException('add_ons_load_failed');
        }
        const selectedSet = new Set(body.selectedAddOnIds);
        for (const id of body.selectedAddOnIds) {
            if (!addOnRows.some((r) => r.id === id)) {
                throw new common_1.BadRequestException('validation_failed');
            }
        }
        const selectedMap = {};
        for (const row of addOnRows)
            selectedMap[row.id] = selectedSet.has(row.id);
        const travelerCount = body.adults + body.children;
        const durationDays = Math.max(1, Number(pkg.duration_days) || 4);
        const addOnsUsd = (0, pricing_1.computeAddOnsUsdSelected)(addOnRows, selectedMap, travelerCount, durationDays);
        const totalUsd = Math.round((tourUsd + addOnsUsd) * 100) / 100;
        const phone = body.guestPhone?.trim() || null;
        const customerId = await this.repo.upsertCustomer({
            first_name: body.guestFirstName.trim(),
            last_name: body.guestLastName.trim(),
            email: body.guestEmail.trim().toLowerCase(),
            phone,
        });
        const selectedAddOns = addOnRows
            .filter((row) => selectedSet.has(row.id))
            .map((row) => {
            let calculated = 0;
            if (row.type === 'PER_BOOKING')
                calculated = row.price;
            else if (row.type === 'PER_PERSON')
                calculated = row.price * travelerCount;
            else if (row.type === 'PER_DAY')
                calculated = row.price * durationDays;
            return {
                id: row.id,
                quantity: 1,
                price: Math.round(calculated * 100) / 100,
            };
        });
        const bookingId = await this.repo.createBookingWithAddOns({
            package_id: pkg.id,
            customer_id: customerId,
            travel_date: ymd,
            travelers_count: travelerCount,
            base_price_applied: basePrice,
            season_multiplier_applied: multiplier,
            total_calculated_price: totalUsd,
            addOns: selectedAddOns,
        });
        return { ok: true, bookingId, totalUsd };
    }
};
exports.BookingService = BookingService;
exports.BookingService = BookingService = BookingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [booking_repository_1.BookingRepository,
        catalog_service_1.CatalogService])
], BookingService);
//# sourceMappingURL=booking.service.js.map