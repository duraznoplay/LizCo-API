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
exports.CatalogRepository = void 0;
const common_1 = require("@nestjs/common");
const supabase_admin_service_1 = require("../../supabase/supabase-admin.service");
let CatalogRepository = class CatalogRepository {
    supa;
    constructor(supa) {
        this.supa = supa;
    }
    async listDestinations() {
        const { data, error } = await this.supa.client
            .schema(supabase_admin_service_1.ENTERPRISE_TOURS_SCHEMA)
            .from('destinations')
            .select('id, name, slug')
            .eq('is_active', true)
            .order('name', { ascending: true });
        if (error)
            throw new Error(error.message);
        return (data ?? []);
    }
    async listPackages() {
        const { data, error } = await this.supa.client
            .schema(supabase_admin_service_1.ENTERPRISE_TOURS_SCHEMA)
            .from('packages')
            .select('name, slug, base_price, duration_days, duration_nights, destinations(name, slug)')
            .eq('is_active', true)
            .order('name', { ascending: true });
        if (error)
            throw new Error(error.message);
        return (data ?? []);
    }
    async listAddOnsForPackageSlug(packageSlug) {
        const { data: pkg, error: pe } = await this.supa.client
            .schema(supabase_admin_service_1.ENTERPRISE_TOURS_SCHEMA)
            .from('packages')
            .select('id')
            .eq('slug', packageSlug)
            .maybeSingle();
        if (pe)
            throw new Error(pe.message);
        if (!pkg)
            return [];
        const pkgId = pkg.id;
        const junction = await this.supa.client
            .schema(supabase_admin_service_1.ENTERPRISE_TOURS_SCHEMA)
            .from('package_add_ons')
            .select('add_ons ( id, name, type, price, is_active )')
            .eq('package_id', pkgId);
        if (!junction.error && junction.data?.length) {
            return this.flattenEmbeddedAddOns(junction.data);
        }
        const direct = await this.supa.client
            .schema(supabase_admin_service_1.ENTERPRISE_TOURS_SCHEMA)
            .from('add_ons')
            .select('id, name, type, price, is_active')
            .eq('package_id', pkgId)
            .eq('is_active', true)
            .order('name', { ascending: true });
        if (direct.error)
            throw new Error(direct.error.message);
        return direct.data ?? [];
    }
    async listAllAddOns() {
        const { data, error } = await this.supa.client
            .schema(supabase_admin_service_1.ENTERPRISE_TOURS_SCHEMA)
            .from('add_ons')
            .select('id, name, type, price, is_active')
            .order('name', { ascending: true });
        if (error)
            throw new Error(error.message);
        return data ?? [];
    }
    async listBlogs() {
        const { data, error } = await this.supa.client
            .schema(supabase_admin_service_1.ENTERPRISE_TOURS_SCHEMA)
            .from('blogs')
            .select('slug, title, excerpt, published_at')
            .eq('is_active', true)
            .order('published_at', { ascending: false });
        if (error)
            throw new Error(error.message);
        return (data ?? []);
    }
    async blogBySlug(slug) {
        const { data, error } = await this.supa.client
            .schema(supabase_admin_service_1.ENTERPRISE_TOURS_SCHEMA)
            .from('blogs')
            .select('slug, title, excerpt, body, published_at')
            .eq('slug', slug)
            .eq('is_active', true)
            .maybeSingle();
        if (error)
            throw new Error(error.message);
        return data ?? null;
    }
    async createAddOn(dto) {
        const { data, error } = await this.supa.client
            .schema(supabase_admin_service_1.ENTERPRISE_TOURS_SCHEMA)
            .from('add_ons')
            .insert([dto])
            .select('id, name, type, price, is_active')
            .single();
        if (error)
            throw new Error(error.message);
        return data;
    }
    async updateAddOn(id, dto) {
        const { data, error } = await this.supa.client
            .schema(supabase_admin_service_1.ENTERPRISE_TOURS_SCHEMA)
            .from('add_ons')
            .update(dto)
            .eq('id', id)
            .select('id, name, type, price, is_active')
            .single();
        if (error)
            throw new Error(error.message);
        return data;
    }
    async deleteAddOn(id) {
        const { error } = await this.supa.client
            .schema(supabase_admin_service_1.ENTERPRISE_TOURS_SCHEMA)
            .from('add_ons')
            .delete()
            .eq('id', id);
        if (error)
            throw new Error(error.message);
    }
    async getAddOnDependencies(id) {
        const { data, error } = await this.supa.client
            .schema(supabase_admin_service_1.ENTERPRISE_TOURS_SCHEMA)
            .from('package_add_ons')
            .select('packages(id, name, slug)')
            .eq('add_on_id', id);
        if (error)
            throw new Error(error.message);
        const packages = [];
        if (data && Array.isArray(data)) {
            for (const row of data) {
                const pkg = row.packages;
                if (pkg && !Array.isArray(pkg)) {
                    packages.push({
                        id: pkg.id,
                        name: pkg.name,
                        slug: pkg.slug,
                    });
                }
            }
        }
        return packages;
    }
    flattenEmbeddedAddOns(rows) {
        const out = [];
        for (const row of rows) {
            const raw = row.add_ons;
            const list = raw === null || raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
            for (const a of list) {
                if (a?.is_active)
                    out.push(a);
            }
        }
        return out.sort((x, y) => x.name.localeCompare(y.name));
    }
};
exports.CatalogRepository = CatalogRepository;
exports.CatalogRepository = CatalogRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_admin_service_1.SupabaseAdminService])
], CatalogRepository);
//# sourceMappingURL=catalog.repository.js.map