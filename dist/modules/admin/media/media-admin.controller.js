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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaAdminController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_admin_guard_1 = require("../../../common/guards/jwt-admin.guard");
const roles_guard_1 = require("../../../common/guards/roles.guard");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const skip_request_token_decorator_1 = require("../../../common/decorators/skip-request-token.decorator");
const zod_pipe_1 = require("../../../common/pipes/zod.pipe");
const media_service_1 = require("../../media/media.service");
const media_admin_dto_1 = require("../../media/dto/media-admin.dto");
let MediaAdminController = class MediaAdminController {
    mediaService;
    constructor(mediaService) {
        this.mediaService = mediaService;
    }
    async listFromS3(section, slug, variant, limit, offset) {
        const { items, total } = await this.mediaService.listMediaFromS3({
            section,
            slug,
            variant,
            limit: limit ? parseInt(limit, 10) : 10,
            offset: offset ? parseInt(offset, 10) : 0,
        });
        return { items, total };
    }
    async list(section, slug, variant, limit, offset) {
        const { items, total } = await this.mediaService.listMetadata({
            section,
            slug,
            variant,
            limit: limit ? parseInt(limit, 10) : 50,
            offset: offset ? parseInt(offset, 10) : 0,
        });
        const domain = process.env.CLOUDFRONT_DOMAIN || '';
        const details = items.map((item) => ({
            id: item.id,
            s3_key: item.s3_key,
            section: item.section,
            slug: item.slug || undefined,
            variant: item.variant || undefined,
            title: item.title || undefined,
            description: item.description || undefined,
            alt_text: item.alt_text || undefined,
            size_bytes: item.size_bytes || undefined,
            content_type: item.content_type || undefined,
            url: `https://${domain}/${encodeURI(item.s3_key)}`,
            created_at: item.created_at,
            updated_at: item.updated_at,
        }));
        return {
            items: details,
            total,
        };
    }
    async getById(id) {
        const metadata = await this.mediaService.getMetadata(id);
        if (!metadata)
            throw new common_1.NotFoundException('media_not_found');
        const domain = process.env.CLOUDFRONT_DOMAIN || '';
        return {
            id: metadata.id,
            s3_key: metadata.s3_key,
            section: metadata.section,
            slug: metadata.slug || undefined,
            variant: metadata.variant || undefined,
            title: metadata.title || undefined,
            description: metadata.description || undefined,
            alt_text: metadata.alt_text || undefined,
            size_bytes: metadata.size_bytes || undefined,
            content_type: metadata.content_type || undefined,
            url: `https://${domain}/${encodeURI(metadata.s3_key)}`,
            created_at: metadata.created_at,
            updated_at: metadata.updated_at,
        };
    }
    async generatePresignedUrl(body) {
        return this.mediaService.generatePresignedUrl(body);
    }
    async uploadFile(file, body) {
        if (!file) {
            throw new common_1.BadGatewayException('file_required');
        }
        const { key, size } = await this.mediaService.uploadFile(body.section, body.slug, body.variant, file.originalname, file.mimetype, file.buffer);
        return { key, size };
    }
    async create(_body) {
        throw new Error('Use POST /admin/media/presigned-url first, then PUT /admin/media/:id after upload');
    }
    async update(id, body) {
        const metadata = await this.mediaService.updateMetadata(id, body);
        if (!metadata)
            throw new common_1.NotFoundException('media_not_found');
        const domain = process.env.CLOUDFRONT_DOMAIN || '';
        return {
            id: metadata.id,
            s3_key: metadata.s3_key,
            section: metadata.section,
            slug: metadata.slug || undefined,
            variant: metadata.variant || undefined,
            title: metadata.title || undefined,
            description: metadata.description || undefined,
            alt_text: metadata.alt_text || undefined,
            size_bytes: metadata.size_bytes || undefined,
            content_type: metadata.content_type || undefined,
            url: `https://${domain}/${encodeURI(metadata.s3_key)}`,
            created_at: metadata.created_at,
            updated_at: metadata.updated_at,
        };
    }
    async delete(id) {
        const metadata = await this.mediaService.getMetadata(id);
        if (!metadata)
            throw new common_1.NotFoundException('media_not_found');
        await this.mediaService.deleteById(id);
        return { success: true };
    }
    async registerUpload(body) {
        const metadata = await this.mediaService.createMetadata(body.s3_key, {
            section: body.section,
            slug: body.slug,
            variant: body.variant,
            title: body.title,
            description: body.description,
            alt_text: body.alt_text,
        });
        const domain = process.env.CLOUDFRONT_DOMAIN || '';
        return {
            id: metadata.id,
            s3_key: metadata.s3_key,
            section: metadata.section,
            slug: metadata.slug || undefined,
            variant: metadata.variant || undefined,
            title: metadata.title || undefined,
            description: metadata.description || undefined,
            alt_text: metadata.alt_text || undefined,
            size_bytes: metadata.size_bytes || undefined,
            content_type: metadata.content_type || undefined,
            url: `https://${domain}/${encodeURI(metadata.s3_key)}`,
            created_at: metadata.created_at,
            updated_at: metadata.updated_at,
        };
    }
};
exports.MediaAdminController = MediaAdminController;
__decorate([
    (0, common_1.Get)('s3'),
    (0, roles_decorator_1.Roles)('ADMIN', 'STAFF'),
    __param(0, (0, common_1.Query)('section')),
    __param(1, (0, common_1.Query)('slug')),
    __param(2, (0, common_1.Query)('variant')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], MediaAdminController.prototype, "listFromS3", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('ADMIN', 'STAFF'),
    __param(0, (0, common_1.Query)('section')),
    __param(1, (0, common_1.Query)('slug')),
    __param(2, (0, common_1.Query)('variant')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], MediaAdminController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN', 'STAFF'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MediaAdminController.prototype, "getById", null);
__decorate([
    (0, common_1.Post)('presigned-url'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Body)(new zod_pipe_1.ZodValidationPipe(media_admin_dto_1.presignedUrlSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MediaAdminController.prototype, "generatePresignedUrl", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, skip_request_token_decorator_1.SkipRequestToken)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MediaAdminController.prototype, "uploadFile", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Body)(new zod_pipe_1.ZodValidationPipe(media_admin_dto_1.createMediaSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MediaAdminController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)(new zod_pipe_1.ZodValidationPipe(media_admin_dto_1.updateMediaSchema.partial()))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MediaAdminController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MediaAdminController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)('register-upload'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MediaAdminController.prototype, "registerUpload", null);
exports.MediaAdminController = MediaAdminController = __decorate([
    (0, common_1.Controller)('admin/media'),
    (0, common_1.UseGuards)(jwt_admin_guard_1.JwtAdminGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [media_service_1.MediaService])
], MediaAdminController);
//# sourceMappingURL=media-admin.controller.js.map