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
exports.BlogAdminRepository = void 0;
const common_1 = require("@nestjs/common");
const supabase_admin_service_1 = require("../../../supabase/supabase-admin.service");
const pg_error_1 = require("../../../common/utils/pg-error");
const TABLE = 'blogs';
let BlogAdminRepository = class BlogAdminRepository {
    supabase;
    constructor(supabase) {
        this.supabase = supabase;
    }
    get client() {
        return this.supabase.client.schema(supabase_admin_service_1.ENTERPRISE_TOURS_SCHEMA).from(TABLE);
    }
    async findAll(query) {
        const { page, limit, search } = query;
        const from = (page - 1) * limit;
        let builder = this.client
            .select('id, title, slug, image, author, created_at', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, from + limit - 1);
        if (search)
            builder = builder.ilike('title', `%${search}%`);
        const { data, error, count } = await builder;
        if (error)
            throw (0, pg_error_1.pgError)(error);
        return { items: (data ?? []), total: count ?? 0, page, limit };
    }
    async findById(id) {
        const { data, error } = await this.client.select('*').eq('id', id).maybeSingle();
        if (error)
            throw (0, pg_error_1.pgError)(error);
        return data ?? null;
    }
    async existsBySlug(slug, excludeId) {
        let builder = this.client.select('id', { head: true, count: 'exact' }).eq('slug', slug);
        if (excludeId)
            builder = builder.neq('id', excludeId);
        const { count, error } = await builder;
        if (error)
            throw (0, pg_error_1.pgError)(error);
        return (count ?? 0) > 0;
    }
    async create(data) {
        const { data: row, error } = await this.client.insert(data).select().single();
        if (error)
            throw (0, pg_error_1.pgError)(error);
        return row;
    }
    async update(id, data) {
        const { data: row, error } = await this.client.update(data).eq('id', id).select().maybeSingle();
        if (error)
            throw (0, pg_error_1.pgError)(error);
        return row ?? null;
    }
    async delete(id) {
        const { error } = await this.client.delete().eq('id', id);
        if (error)
            throw (0, pg_error_1.pgError)(error);
    }
};
exports.BlogAdminRepository = BlogAdminRepository;
exports.BlogAdminRepository = BlogAdminRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_admin_service_1.SupabaseAdminService])
], BlogAdminRepository);
//# sourceMappingURL=blog-admin.repository.js.map