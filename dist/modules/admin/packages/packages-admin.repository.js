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
exports.PackagesAdminRepository = void 0;
const common_1 = require("@nestjs/common");
const supabase_admin_service_1 = require("../../../supabase/supabase-admin.service");
let PackagesAdminRepository = class PackagesAdminRepository {
    supabase;
    constructor(supabase) {
        this.supabase = supabase;
    }
    async findAll(query) {
        const { page, limit, search, is_active } = query;
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        let q = this.supabase.client
            .schema(supabase_admin_service_1.ENTERPRISE_TOURS_SCHEMA)
            .from('packages')
            .select('id,name,slug,description,base_price,duration_days,duration_nights,is_active,destination_id,features,image,created_at,updated_at,destinations(id,name,slug)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to);
        if (search) {
            q = q.ilike('name', `%${search}%`);
        }
        if (is_active !== undefined) {
            q = q.eq('is_active', is_active);
        }
        const { data, error, count } = await q;
        if (error)
            throw new Error(error.message);
        return {
            data: (data ?? []),
            total: count ?? 0,
            page,
            limit,
        };
    }
    async findById(id) {
        const { data, error } = await this.supabase.client
            .schema(supabase_admin_service_1.ENTERPRISE_TOURS_SCHEMA)
            .from('packages')
            .select('*,destinations(id,name,slug)')
            .eq('id', id)
            .maybeSingle();
        if (error)
            throw new Error(error.message);
        return data ?? null;
    }
    async create(dto) {
        const { data, error } = await this.supabase.client
            .schema(supabase_admin_service_1.ENTERPRISE_TOURS_SCHEMA)
            .from('packages')
            .insert(dto)
            .select()
            .single();
        if (error)
            throw new Error(error.message);
        return data;
    }
    async update(id, dto) {
        const payload = { ...dto, updated_at: new Date().toISOString() };
        const { data, error } = await this.supabase.client
            .schema(supabase_admin_service_1.ENTERPRISE_TOURS_SCHEMA)
            .from('packages')
            .update(payload)
            .eq('id', id)
            .select()
            .maybeSingle();
        if (error)
            throw new Error(error.message);
        return data ?? null;
    }
    async delete(id) {
        const { error } = await this.supabase.client
            .schema(supabase_admin_service_1.ENTERPRISE_TOURS_SCHEMA)
            .from('packages')
            .delete()
            .eq('id', id);
        if (error)
            throw new Error(error.message);
    }
    async existsBySlug(slug, excludeId) {
        let builder = this.supabase.client
            .schema(supabase_admin_service_1.ENTERPRISE_TOURS_SCHEMA)
            .from('packages')
            .select('id', { head: true, count: 'exact' })
            .eq('slug', slug);
        if (excludeId) {
            builder = builder.neq('id', excludeId);
        }
        const { count, error } = await builder;
        if (error)
            throw new Error(error.message);
        return (count ?? 0) > 0;
    }
    async findDestinations() {
        const { data, error } = await this.supabase.client
            .schema(supabase_admin_service_1.ENTERPRISE_TOURS_SCHEMA)
            .from('destinations')
            .select('id,name,slug')
            .eq('is_active', true)
            .order('name', { ascending: true });
        if (error)
            throw new Error(error.message);
        return (data ?? []);
    }
};
exports.PackagesAdminRepository = PackagesAdminRepository;
exports.PackagesAdminRepository = PackagesAdminRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_admin_service_1.SupabaseAdminService])
], PackagesAdminRepository);
//# sourceMappingURL=packages-admin.repository.js.map