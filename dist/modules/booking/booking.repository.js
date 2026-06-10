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
    async packageBySlug(slug) {
        const { data, error } = await this.supa.client
            .schema(supabase_admin_service_1.ENTERPRISE_TOURS_SCHEMA)
            .from('packages')
            .select('id, base_price, duration_days, slug')
            .eq('slug', slug)
            .maybeSingle();
        if (error)
            throw new Error(error.message);
        return data ?? null;
    }
    async calculatePartyTotal(input) {
        const { data, error } = await this.supa.client
            .schema(supabase_admin_service_1.POSTGREST_PUBLIC_SCHEMA)
            .rpc('lizco_calculate_total_price', {
            p_package_id: input.packageId,
            p_travel_date: input.travelDate,
            p_pax_count: input.paxCount,
        });
        if (error)
            throw new Error(error.message);
        const total = Number(data);
        if (!Number.isFinite(total))
            throw new Error('pricing_unavailable');
        return total;
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
    async createBookingWithAddOns(input) {
        const { data, error } = await this.supa.client
            .schema(supabase_admin_service_1.POSTGREST_PUBLIC_SCHEMA)
            .rpc('lizco_create_booking', {
            p_package_id: input.package_id,
            p_customer_id: input.customer_id,
            p_travel_date: input.travel_date,
            p_travelers_count: input.travelers_count,
            p_base_price: input.base_price_applied,
            p_multiplier: input.season_multiplier_applied,
            p_total_price: input.total_calculated_price,
            p_addon_ids: input.addOns.map((a) => a.id),
            p_addon_quantities: input.addOns.map((a) => a.quantity),
            p_addon_prices: input.addOns.map((a) => a.price),
        });
        if (error || !data)
            throw new Error(error?.message ?? 'booking_create_failed');
        return data;
    }
};
exports.BookingRepository = BookingRepository;
exports.BookingRepository = BookingRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_admin_service_1.SupabaseAdminService])
], BookingRepository);
//# sourceMappingURL=booking.repository.js.map