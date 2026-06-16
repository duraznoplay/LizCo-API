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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingRepository = void 0;
const common_1 = require("@nestjs/common");
const supabase_admin_service_1 = require("../../supabase/supabase-admin.service");
let BookingRepository = class BookingRepository {
    supa;
    constructor(supa) {
        this.supa = supa;
    }
    get pub() {
        return this.supa.client.schema(supabase_admin_service_1.POSTGREST_PUBLIC_SCHEMA);
    }
    async packageBySlug(slug) {
        const { data, error } = await this.pub
            .from('tour_packages')
            .select('id, slug, name, pricing_model, nights, catalog_meta')
            .eq('slug', slug)
            .eq('is_active', true)
            .maybeSingle();
        if (error)
            throw new Error(error.message);
        return data ?? null;
    }
    async standardDepartureById(id) {
        const { data, error } = await this.pub
            .from('package_departures')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (error)
            throw new Error(error.message);
        return data ?? null;
    }
    async standardDeparturesByDate(packageId, date) {
        const { data, error } = await this.pub
            .from('package_departures')
            .select('*')
            .eq('package_id', packageId)
            .eq('departure_date', date)
            .eq('is_active', true);
        if (error)
            throw new Error(error.message);
        return (data ?? []);
    }
    async hotelDepartureById(id) {
        const { data, error } = await this.pub
            .from('hotel_departures')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (error)
            throw new Error(error.message);
        return data ?? null;
    }
    async hotelDepartureByKey(hotelId, date) {
        const { data, error } = await this.pub
            .from('hotel_departures')
            .select('*')
            .eq('hotel_id', hotelId)
            .eq('departure_date', date)
            .eq('is_active', true)
            .maybeSingle();
        if (error)
            throw new Error(error.message);
        return data ?? null;
    }
    async medellinCellById(id) {
        const { data, error } = await this.pub
            .from('medellin_price_grid')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (error)
            throw new Error(error.message);
        return data ?? null;
    }
    async medellinCellByKey(hotelId, season, nights) {
        const { data, error } = await this.pub
            .from('medellin_price_grid')
            .select('*')
            .eq('hotel_id', hotelId)
            .eq('season', season)
            .eq('nights', nights)
            .eq('is_active', true)
            .maybeSingle();
        if (error)
            throw new Error(error.message);
        return data ?? null;
    }
    async hotelById(id) {
        const { data, error } = await this.pub
            .from('package_hotels')
            .select('id, package_id, name, meal_plan, is_active')
            .eq('id', id)
            .maybeSingle();
        if (error)
            throw new Error(error.message);
        return data ?? null;
    }
    async createBooking(row) {
        const { data, error } = await this.pub
            .from('bookings')
            .insert({ ...row, status: 'pending' })
            .select('id')
            .single();
        if (error || !data)
            throw new Error(error?.message ?? 'booking_create_failed');
        return data.id;
    }
    async insertBookingAddons(bookingId, addOns) {
        const uuidLike = addOns.filter((a) => /^[0-9a-f-]{36}$/i.test(a.id));
        if (!uuidLike.length)
            return;
        const { data: known, error: qErr } = await this.pub
            .from('package_addons')
            .select('id')
            .in('id', uuidLike.map((a) => a.id));
        if (qErr)
            return;
        const knownSet = new Set((known ?? []).map((r) => r.id));
        const rows = uuidLike
            .filter((a) => knownSet.has(a.id))
            .map((a) => ({ booking_id: bookingId, addon_id: a.id, quantity: a.quantity, price_usd: a.price_usd }));
        if (!rows.length)
            return;
        await this.pub.from('booking_addons').insert(rows);
    }
    async upsertCustomer(input) {
        const { data: newRow, error: insertErr } = await this.supa.client
            .schema(supabase_admin_service_1.ENTERPRISE_TOURS_SCHEMA)
            .from('customers')
            .insert({ ...input, lead_source: 'lizco_global_tours_web' })
            .select('id')
            .maybeSingle();
        if (newRow)
            return newRow.id;
        if (insertErr?.code !== '23505') {
            throw new Error(insertErr?.message ?? 'customer_insert_failed');
        }
        const { data: existing, error: updateErr } = await this.supa.client
            .schema(supabase_admin_service_1.ENTERPRISE_TOURS_SCHEMA)
            .from('customers')
            .update({ first_name: input.first_name, last_name: input.last_name, phone: input.phone })
            .eq('email', input.email)
            .select('id')
            .single();
        if (updateErr || !existing)
            throw new Error(updateErr?.message ?? 'customer_upsert_failed');
        return existing.id;
    }
};
exports.BookingRepository = BookingRepository;
exports.BookingRepository = BookingRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_admin_service_1.SupabaseAdminService])
], BookingRepository);
//# sourceMappingURL=booking.repository.js.map