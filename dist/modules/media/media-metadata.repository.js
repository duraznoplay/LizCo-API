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
exports.MediaMetadataRepository = void 0;
const common_1 = require("@nestjs/common");
const supabase_admin_service_1 = require("../../supabase/supabase-admin.service");
let MediaMetadataRepository = class MediaMetadataRepository {
    supabase;
    constructor(supabase) {
        this.supabase = supabase;
    }
    async create(data) {
        const { data: result, error } = await this.supabase.client
            .schema('enterprise_tours')
            .from('media_metadata')
            .insert({
            s3_key: data.s3_key,
            section: data.section,
            slug: data.slug || null,
            variant: data.variant || null,
            title: data.title || null,
            description: data.description || null,
            alt_text: data.alt_text || null,
            size_bytes: data.size_bytes || null,
            content_type: data.content_type || null,
        })
            .select()
            .single();
        if (error)
            throw error;
        return result;
    }
    async findByKey(s3_key) {
        const { data, error } = await this.supabase.client
            .schema('enterprise_tours')
            .from('media_metadata')
            .select('*')
            .eq('s3_key', s3_key)
            .single();
        if (error)
            return null;
        return data;
    }
    async findById(id) {
        const { data, error } = await this.supabase.client
            .schema('enterprise_tours')
            .from('media_metadata')
            .select('*')
            .eq('id', id)
            .single();
        if (error)
            return null;
        return data;
    }
    async findAll(filters) {
        let query = this.supabase.client
            .schema('enterprise_tours')
            .from('media_metadata')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });
        if (filters?.section) {
            query = query.eq('section', filters.section);
        }
        if (filters?.slug) {
            query = query.eq('slug', filters.slug);
        }
        if (filters?.variant) {
            query = query.eq('variant', filters.variant);
        }
        const limit = filters?.limit || 50;
        const offset = filters?.offset || 0;
        query = query.range(offset, offset + limit - 1);
        const { data, error, count } = await query;
        if (error)
            throw error;
        return {
            items: data || [],
            total: count || 0,
        };
    }
    async update(id, data) {
        const updatePayload = {};
        if (data.title !== undefined)
            updatePayload.title = data.title || null;
        if (data.description !== undefined)
            updatePayload.description = data.description || null;
        if (data.alt_text !== undefined)
            updatePayload.alt_text = data.alt_text || null;
        if (data.slug !== undefined)
            updatePayload.slug = data.slug || null;
        if (data.variant !== undefined)
            updatePayload.variant = data.variant || null;
        const { data: result, error } = await this.supabase.client
            .schema('enterprise_tours')
            .from('media_metadata')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        return result;
    }
    async delete(id) {
        const { error } = await this.supabase.client
            .schema('enterprise_tours')
            .from('media_metadata')
            .delete()
            .eq('id', id);
        if (error)
            throw error;
    }
    async deleteByKey(s3_key) {
        const { error } = await this.supabase.client
            .schema('enterprise_tours')
            .from('media_metadata')
            .delete()
            .eq('s3_key', s3_key);
        if (error)
            throw error;
    }
};
exports.MediaMetadataRepository = MediaMetadataRepository;
exports.MediaMetadataRepository = MediaMetadataRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_admin_service_1.SupabaseAdminService])
], MediaMetadataRepository);
//# sourceMappingURL=media-metadata.repository.js.map