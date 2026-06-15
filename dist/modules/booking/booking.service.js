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
const departure_pricing_1 = require("./domain/departure-pricing");
let BookingService = BookingService_1 = class BookingService {
    repo;
    catalog;
    log = new common_1.Logger(BookingService_1.name);
    constructor(repo, catalog) {
        this.repo = repo;
        this.catalog = catalog;
    }
    async resolveDeparture(pkg, sel) {
        if (pkg.pricing_model === 'standard') {
            let row = null;
            if (sel.departureId) {
                row = await this.repo.standardDepartureById(sel.departureId);
                if (row && row.package_id !== pkg.id)
                    row = null;
            }
            else if (sel.date) {
                const rows = await this.repo.standardDeparturesByDate(pkg.id, sel.date);
                if (rows.length > 1) {
                    const match = sel.returnDate ? rows.filter((r) => r.return_date === sel.returnDate) : rows;
                    if (match.length !== 1)
                        throw new common_1.ConflictException('ambiguous_departure');
                    row = match[0];
                }
                else {
                    row = rows[0] ?? null;
                }
            }
            if (!row || !row.is_active)
                throw new common_1.NotFoundException('departure_not_found');
            return {
                priceRow: row,
                departureId: row.id,
                hotelDepartureId: null,
                hotelId: null,
                medellinNights: null,
                info: {
                    id: row.id,
                    date: row.departure_date,
                    returnDate: row.return_date,
                    hotelId: null,
                    hotelName: null,
                    season: row.season,
                    nights: pkg.nights,
                    label: row.label,
                    availableSpots: row.available_spots,
                },
            };
        }
        if (pkg.pricing_model === 'hotel_based') {
            let row;
            if (sel.departureId) {
                row = await this.repo.hotelDepartureById(sel.departureId);
            }
            else if (sel.hotelId && sel.date) {
                row = await this.repo.hotelDepartureByKey(sel.hotelId, sel.date);
            }
            else {
                throw new common_1.BadRequestException('hotel_required');
            }
            if (!row || !row.is_active)
                throw new common_1.NotFoundException('departure_not_found');
            const hotel = await this.repo.hotelById(row.hotel_id);
            if (!hotel || hotel.package_id !== pkg.id || !hotel.is_active) {
                throw new common_1.NotFoundException('departure_not_found');
            }
            return {
                priceRow: row,
                departureId: null,
                hotelDepartureId: row.id,
                hotelId: hotel.id,
                medellinNights: null,
                info: {
                    id: row.id,
                    date: row.departure_date,
                    returnDate: row.return_date,
                    hotelId: hotel.id,
                    hotelName: hotel.name,
                    season: row.season,
                    nights: pkg.nights,
                    label: row.label,
                    availableSpots: row.available_spots,
                },
            };
        }
        let row;
        if (sel.departureId) {
            row = await this.repo.medellinCellById(sel.departureId);
        }
        else if (sel.hotelId && sel.nights && sel.season) {
            row = await this.repo.medellinCellByKey(sel.hotelId, sel.season, sel.nights);
        }
        else {
            throw new common_1.BadRequestException('hotel_season_selection_required');
        }
        if (!row || !row.is_active)
            throw new common_1.NotFoundException('departure_not_found');
        const hotel = await this.repo.hotelById(row.hotel_id);
        if (!hotel || hotel.package_id !== pkg.id || !hotel.is_active) {
            throw new common_1.NotFoundException('departure_not_found');
        }
        return {
            priceRow: { ...row, price_single_usd: null },
            departureId: null,
            hotelDepartureId: null,
            hotelId: hotel.id,
            medellinNights: row.nights,
            info: {
                id: row.id,
                date: null,
                returnDate: null,
                hotelId: hotel.id,
                hotelName: hotel.name,
                season: row.season,
                nights: row.nights,
                label: null,
                availableSpots: null,
            },
        };
    }
    priceParty(pkg, resolved, occupancy, adults, childrenAges) {
        try {
            return (0, departure_pricing_1.quoteParty)(resolved.priceRow, occupancy, adults, childrenAges, pkg.catalog_meta);
        }
        catch (e) {
            if (e instanceof departure_pricing_1.PricingError)
                throw new common_1.BadRequestException(e.code);
            throw e;
        }
    }
    async quote(q) {
        const pkg = await this.repo.packageBySlug(q.packageSlug);
        if (!pkg)
            throw new common_1.NotFoundException('package_not_found');
        const adults = q.adults ?? q.pax ?? 2;
        const childrenAges = q.childrenAges ?? [];
        const resolved = await this.resolveDeparture(pkg, q);
        const party = this.priceParty(pkg, resolved, q.occupancy, adults, childrenAges);
        const deposit = (0, departure_pricing_1.depositUsd)(party.tourTotalUsd, pkg.catalog_meta);
        const refDate = resolved.info.date ?? `${resolved.info.season}-${resolved.info.nights}n`;
        const ref = `LIZCO-${q.packageSlug}-${refDate}`;
        return {
            ok: true,
            tourId: q.tourId ?? null,
            packageSlug: q.packageSlug,
            pricingModel: pkg.pricing_model,
            departure: resolved.info,
            occupancy: q.occupancy,
            adults,
            childrenAges,
            perAdultUsd: party.perAdultUsd,
            adultsUsd: party.adultsUsd,
            children: party.children,
            childrenUsd: party.childrenUsd,
            tourTotalUsd: party.tourTotalUsd,
            deposit,
            mealPlan: pkg.catalog_meta?.meal_plan ?? null,
            travelDate: resolved.info.date,
            paxCount: adults + childrenAges.length,
            perPersonUsd: party.perAdultUsd,
            totalPartyUsd: party.tourTotalUsd,
            boldPrepared: (0, pricing_1.buildBoldCheckoutPayload)({
                bookingReference: ref,
                amount: party.perAdultUsd,
                currency: 'USD',
                tourId: q.tourId,
                packageSlug: q.packageSlug,
                travelDateIso: resolved.info.date ?? '',
            }),
        };
    }
    async submit(body) {
        const pkg = await this.repo.packageBySlug(body.packageSlug);
        if (!pkg)
            throw new common_1.NotFoundException('package_not_found');
        const date = !body.travelDateIso
            ? undefined
            : /^\d{4}-\d{2}-\d{2}$/.test(body.travelDateIso)
                ? body.travelDateIso
                : (0, pricing_1.toLocalYmd)(body.travelDateIso);
        const resolved = await this.resolveDeparture(pkg, { ...body, date });
        const childrenAges = body.childrenAges ?? Array.from({ length: body.children }, () => 17);
        const party = this.priceParty(pkg, resolved, body.occupancy, body.adults, childrenAges);
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
        const travelerCount = body.adults + childrenAges.length;
        const durationDays = Math.max(1, (resolved.info.nights ?? pkg.nights) + 1);
        const addOnsUsd = (0, pricing_1.computeAddOnsUsdSelected)(addOnRows, selectedMap, travelerCount, durationDays);
        const totalUsd = Math.round((party.tourTotalUsd + addOnsUsd) * 100) / 100;
        const deposit = (0, departure_pricing_1.depositUsd)(totalUsd, pkg.catalog_meta);
        const depositDue = body.paymentMode === 'deposit' ? (deposit?.amountUsd ?? null) : null;
        const phone = body.guestPhone?.trim() || null;
        await this.repo.upsertCustomer({
            first_name: body.guestFirstName.trim(),
            last_name: body.guestLastName.trim(),
            email: body.guestEmail.trim().toLowerCase(),
            phone,
        });
        const addonsSnapshot = addOnRows
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
                name: row.name,
                quantity: 1,
                price_usd: Math.round(calculated * 100) / 100,
            };
        });
        let bookingId;
        try {
            bookingId = await this.repo.createBooking(this.buildBookingRow(body, pkg, resolved, childrenAges, totalUsd, depositDue, addonsSnapshot, phone));
        }
        catch (e) {
            if (e instanceof Error && e.message.includes('no_availability')) {
                throw new common_1.ConflictException('no_availability');
            }
            throw e;
        }
        await this.repo.insertBookingAddons(bookingId, addonsSnapshot);
        return { ok: true, bookingId, totalUsd, depositUsd: depositDue };
    }
    buildBookingRow(body, pkg, resolved, childrenAges, totalUsd, depositDue, addonsSnapshot, phone) {
        return {
            package_id: pkg.id,
            departure_id: resolved.departureId,
            hotel_departure_id: resolved.hotelDepartureId,
            hotel_id: resolved.hotelId,
            room_type: body.occupancy,
            medellin_nights: resolved.medellinNights,
            adults: body.adults,
            children_ages: childrenAges,
            guest_name: `${body.guestFirstName.trim()} ${body.guestLastName.trim()}`,
            guest_email: body.guestEmail.trim().toLowerCase(),
            guest_phone: phone,
            guest_country: body.guestCountry?.trim() || null,
            special_requests: body.specialRequests?.trim() || null,
            total_usd: totalUsd,
            payment_mode: body.paymentMode,
            deposit_usd: depositDue,
            addons_snapshot: addonsSnapshot,
            display_currency: 'USD',
        };
    }
};
exports.BookingService = BookingService;
exports.BookingService = BookingService = BookingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [booking_repository_1.BookingRepository,
        catalog_service_1.CatalogService])
], BookingService);
//# sourceMappingURL=booking.service.js.map