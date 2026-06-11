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
exports.BlogAdminService = void 0;
const common_1 = require("@nestjs/common");
const pg_error_1 = require("../../../common/utils/pg-error");
const blog_admin_repository_1 = require("./blog-admin.repository");
const slug_util_1 = require("./utils/slug.util");
const reading_time_util_1 = require("./utils/reading-time.util");
const blog_status_enum_1 = require("./dto/blog-status.enum");
let BlogAdminService = class BlogAdminService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    findAll(query) {
        return this.repo.findAll(query);
    }
    async findById(id) {
        const post = await this.repo.findById(id);
        if (!post)
            throw new common_1.NotFoundException(`Blog post ${id} not found`);
        return post;
    }
    async findBySlug(slug) {
        const post = await this.repo.findBySlug(slug);
        if (!post)
            throw new common_1.NotFoundException(`Blog post ${slug} not found`);
        return post;
    }
    async create(dto, userId) {
        const slug = dto.slug ?? (0, slug_util_1.generateSlug)(dto.title);
        await this.assertSlugAvailable(slug);
        const readingTime = (0, reading_time_util_1.calculateReadingTime)(dto.content);
        try {
            return await this.repo.create({
                title: dto.title,
                slug,
                content: dto.content,
                image: dto.image,
                status: dto.status ?? blog_status_enum_1.BlogStatus.DRAFT,
                meta_description: dto.meta_description,
                meta_keywords: dto.meta_keywords,
                featured: dto.featured ?? false,
                reading_time_minutes: readingTime,
                created_by: userId,
            });
        }
        catch (err) {
            if ((0, pg_error_1.isUniqueViolation)(err))
                throw new common_1.ConflictException('slug_already_exists');
            throw err;
        }
    }
    async update(id, dto, _userId) {
        const existing = await this.findById(id);
        const payload = {};
        if (dto.title !== undefined)
            payload.title = dto.title;
        if (dto.image !== undefined)
            payload.image = dto.image;
        if (dto.status !== undefined) {
            this.validateStatusTransition(existing.status, dto.status);
            payload.status = dto.status;
        }
        if (dto.meta_description !== undefined)
            payload.meta_description = dto.meta_description;
        if (dto.meta_keywords !== undefined)
            payload.meta_keywords = dto.meta_keywords;
        if (dto.featured !== undefined)
            payload.featured = dto.featured;
        if (dto.content !== undefined) {
            payload.content = dto.content;
            payload.reading_time_minutes = (0, reading_time_util_1.calculateReadingTime)(dto.content);
        }
        if (dto.slug !== undefined) {
            await this.assertSlugAvailable(dto.slug, id);
            payload.slug = dto.slug;
        }
        else if (dto.title !== undefined) {
            const newSlug = (0, slug_util_1.generateSlug)(dto.title);
            const taken = await this.repo.existsBySlug(newSlug, id);
            if (taken)
                throw new common_1.ConflictException('auto_slug_conflict');
            payload.slug = newSlug;
        }
        if (Object.keys(payload).length === 0) {
            throw new common_1.BadRequestException('no_fields_to_update');
        }
        let updated;
        try {
            updated = await this.repo.update(id, payload);
        }
        catch (err) {
            if ((0, pg_error_1.isUniqueViolation)(err))
                throw new common_1.ConflictException('slug_already_exists');
            throw err;
        }
        if (!updated)
            throw new common_1.NotFoundException(`Blog post ${id} not found`);
        return updated;
    }
    async delete(id) {
        await this.findById(id);
        await this.repo.delete(id);
    }
    async restore(id) {
        const post = await this.repo.restore(id);
        if (!post)
            throw new common_1.NotFoundException(`Blog post ${id} not found`);
        return post;
    }
    async publish(id, userId) {
        return this.transitionStatus(id, blog_status_enum_1.BlogStatus.PUBLISHED, userId);
    }
    async archive(id, userId) {
        return this.transitionStatus(id, blog_status_enum_1.BlogStatus.ARCHIVED, userId);
    }
    async transitionStatus(id, newStatus, _userId) {
        const existing = await this.findById(id);
        this.validateStatusTransition(existing.status, newStatus);
        const updated = await this.repo.update(id, { status: newStatus });
        if (!updated)
            throw new common_1.NotFoundException(`Blog post ${id} not found`);
        return updated;
    }
    async bulkPublish(ids) {
        if (!ids.length)
            throw new common_1.BadRequestException('ids must not be empty');
        await this.repo.bulkUpdateStatus(ids, blog_status_enum_1.BlogStatus.PUBLISHED);
        return { success: true, count: ids.length };
    }
    async bulkArchive(ids) {
        if (!ids.length)
            throw new common_1.BadRequestException('ids must not be empty');
        await this.repo.bulkUpdateStatus(ids, blog_status_enum_1.BlogStatus.ARCHIVED);
        return { success: true, count: ids.length };
    }
    async getStats() {
        return this.repo.countByStatus();
    }
    validateStatusTransition(currentStatus, newStatus) {
        const validTransitions = {
            [blog_status_enum_1.BlogStatus.DRAFT]: [blog_status_enum_1.BlogStatus.PUBLISHED, blog_status_enum_1.BlogStatus.ARCHIVED],
            [blog_status_enum_1.BlogStatus.PUBLISHED]: [blog_status_enum_1.BlogStatus.ARCHIVED, blog_status_enum_1.BlogStatus.DRAFT],
            [blog_status_enum_1.BlogStatus.ARCHIVED]: [blog_status_enum_1.BlogStatus.DRAFT, blog_status_enum_1.BlogStatus.PUBLISHED],
        };
        const allowed = validTransitions[currentStatus];
        if (!allowed.includes(newStatus)) {
            throw new common_1.BadRequestException(`Cannot transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowed.join(', ')}`);
        }
    }
    async assertSlugAvailable(slug, excludeId) {
        const exists = await this.repo.existsBySlug(slug, excludeId);
        if (exists)
            throw new common_1.ConflictException('slug_already_exists');
    }
};
exports.BlogAdminService = BlogAdminService;
exports.BlogAdminService = BlogAdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [blog_admin_repository_1.BlogAdminRepository])
], BlogAdminService);
//# sourceMappingURL=blog-admin.service.js.map