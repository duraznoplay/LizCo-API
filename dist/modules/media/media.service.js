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
var MediaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaService = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const media_list_response_dto_1 = require("./dto/media-list-response.dto");
const s3_client_provider_1 = require("./providers/s3-client.provider");
const media_metadata_repository_1 = require("./media-metadata.repository");
const SECTION_SET = new Set(media_list_response_dto_1.MEDIA_SECTIONS);
const VARIANT_SET = new Set(media_list_response_dto_1.MEDIA_VARIANTS);
let MediaService = MediaService_1 = class MediaService {
    s3;
    config;
    metadataRepo;
    log = new common_1.Logger(MediaService_1.name);
    constructor(s3, config, metadataRepo) {
        this.s3 = s3;
        this.config = config;
        this.metadataRepo = metadataRepo;
    }
    async listMedia(query = {}) {
        const bucket = this.config.get('S3_BUCKET_NAME', { infer: true });
        const domain = this.config.get('CLOUDFRONT_DOMAIN', { infer: true });
        const region = this.config.get('AWS_REGION', { infer: true });
        const accessKeyId = this.config.get('AWS_ACCESS_KEY_ID', { infer: true });
        const secretAccessKey = this.config.get('AWS_SECRET_ACCESS_KEY', { infer: true });
        if (!bucket || !domain || !region || !accessKeyId || !secretAccessKey) {
            throw new common_1.ServiceUnavailableException('media_not_configured');
        }
        const resolvedPrefix = resolvePrefix(query);
        this.log.log({ msg: 'media_list', prefix: resolvedPrefix, limit: query.limit ?? null });
        try {
            const out = await this.s3.send(new client_s3_1.ListObjectsV2Command({
                Bucket: bucket,
                Prefix: resolvedPrefix,
                ...(query.limit ? { MaxKeys: query.limit } : {}),
            }));
            let items = (out.Contents ?? [])
                .map((c) => {
                const key = c.Key;
                if (!key)
                    return null;
                const item = {
                    key,
                    url: `https://${domain}/${encodeURI(key)}`,
                };
                if (c.Size !== undefined)
                    item.size = c.Size;
                if (c.LastModified)
                    item.lastModified = c.LastModified.toISOString();
                const meta = deriveMeta(key);
                if (meta.section)
                    item.section = meta.section;
                if (meta.slug)
                    item.slug = meta.slug;
                if (meta.variant)
                    item.variant = meta.variant;
                if (meta.filename)
                    item.filename = meta.filename;
                return item;
            })
                .filter((x) => x !== null);
            if (query.limit && items.length > query.limit) {
                items = items.slice(0, query.limit);
            }
            return { items };
        }
        catch {
            throw new common_1.BadGatewayException('media_list_failed');
        }
    }
    async generatePresignedUrl(req) {
        const bucket = this.config.get('S3_BUCKET_NAME', { infer: true });
        if (!bucket)
            throw new common_1.ServiceUnavailableException('s3_not_configured');
        const key = buildS3Key(req.section, req.slug, req.variant, req.filename);
        const contentType = req.contentType || 'image/jpeg';
        try {
            const command = new client_s3_1.PutObjectCommand({
                Bucket: bucket,
                Key: key,
                ContentType: contentType,
            });
            const url = await (0, s3_request_presigner_1.getSignedUrl)(this.s3, command, { expiresIn: 900 });
            return {
                url,
                key,
                expiresIn: 900,
            };
        }
        catch {
            throw new common_1.BadGatewayException('presigned_url_generation_failed');
        }
    }
    async createMetadata(s3_key, data, sizeBytes, contentType) {
        return this.metadataRepo.create({
            ...data,
            s3_key,
            size_bytes: sizeBytes,
            content_type: contentType,
        });
    }
    async getMetadata(id) {
        return this.metadataRepo.findById(id);
    }
    async getMetadataByKey(s3_key) {
        return this.metadataRepo.findByKey(s3_key);
    }
    async listMetadata(filters) {
        return this.metadataRepo.findAll(filters);
    }
    async listMediaFromS3(filters) {
        const bucket = this.config.get('S3_BUCKET_NAME', { infer: true });
        const domain = this.config.get('CLOUDFRONT_DOMAIN', { infer: true });
        if (!bucket || !domain)
            throw new common_1.ServiceUnavailableException('s3_not_configured');
        const resolvedPrefix = this.buildPrefix(filters);
        const limit = filters?.limit || 10;
        const offset = filters?.offset || 0;
        try {
            const countResult = await this.s3.send(new client_s3_1.ListObjectsV2Command({
                Bucket: bucket,
                Prefix: resolvedPrefix,
            }));
            const total = countResult.Contents?.length || 0;
            const out = await this.s3.send(new client_s3_1.ListObjectsV2Command({
                Bucket: bucket,
                Prefix: resolvedPrefix,
                MaxKeys: limit + offset,
            }));
            const allItems = (out.Contents ?? []).slice(offset, offset + limit);
            const items = await Promise.all(allItems.map(async (c) => {
                const key = c.Key;
                if (!key)
                    return null;
                const meta = deriveMeta(key);
                const metadata = await this.metadataRepo.findByKey(key);
                return {
                    id: metadata?.id,
                    s3_key: key,
                    url: `https://${domain}/${encodeURI(key)}`,
                    section: meta.section || 'unknown',
                    slug: meta.slug || metadata?.slug || undefined,
                    variant: meta.variant || metadata?.variant || undefined,
                    title: metadata?.title || undefined,
                    size_bytes: c.Size,
                    lastModified: c.LastModified?.toISOString(),
                    filename: meta.filename,
                };
            }));
            return {
                items: items.filter((x) => x !== null),
                total,
            };
        }
        catch {
            throw new common_1.BadGatewayException('s3_list_failed');
        }
    }
    buildPrefix(filters) {
        if (!filters?.section)
            return 'media/';
        let prefix = `media/${filters.section}/`;
        if (filters.slug)
            prefix += `${filters.slug}/`;
        if (filters.variant)
            prefix += `${filters.variant}/`;
        return prefix;
    }
    async updateMetadata(id, data) {
        return this.metadataRepo.update(id, data);
    }
    async deleteFile(s3_key) {
        const bucket = this.config.get('S3_BUCKET_NAME', { infer: true });
        if (!bucket)
            throw new common_1.ServiceUnavailableException('s3_not_configured');
        try {
            await this.s3.send(new client_s3_1.DeleteObjectCommand({
                Bucket: bucket,
                Key: s3_key,
            }));
            await this.metadataRepo.deleteByKey(s3_key);
        }
        catch {
            throw new common_1.BadGatewayException('media_deletion_failed');
        }
    }
    async deleteById(id) {
        const metadata = await this.metadataRepo.findById(id);
        if (!metadata)
            throw new Error('metadata_not_found');
        const bucket = this.config.get('S3_BUCKET_NAME', { infer: true });
        if (!bucket)
            throw new common_1.ServiceUnavailableException('s3_not_configured');
        try {
            await this.s3.send(new client_s3_1.DeleteObjectCommand({
                Bucket: bucket,
                Key: metadata.s3_key,
            }));
            await this.metadataRepo.delete(id);
        }
        catch {
            throw new common_1.BadGatewayException('media_deletion_failed');
        }
    }
    async uploadFile(section, slug, variant, filename, contentType, buffer) {
        const bucket = this.config.get('S3_BUCKET_NAME', { infer: true });
        if (!bucket)
            throw new common_1.ServiceUnavailableException('s3_not_configured');
        const key = buildS3Key(section, slug, variant, filename);
        try {
            await this.s3.send(new client_s3_1.PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: buffer,
                ContentType: contentType,
            }));
            return {
                key,
                size: buffer.length,
            };
        }
        catch {
            throw new common_1.BadGatewayException('media_upload_failed');
        }
    }
};
exports.MediaService = MediaService;
exports.MediaService = MediaService = MediaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(s3_client_provider_1.MEDIA_S3_CLIENT)),
    __metadata("design:paramtypes", [client_s3_1.S3Client,
        config_1.ConfigService,
        media_metadata_repository_1.MediaMetadataRepository])
], MediaService);
function resolvePrefix(q) {
    if (q.prefix !== undefined)
        return q.prefix;
    if (!q.section)
        return '';
    let prefix = `media/${q.section}/`;
    if (q.slug)
        prefix += `${q.slug}/`;
    if (q.variant)
        prefix += `${q.variant}/`;
    return prefix;
}
function buildS3Key(section, slug, variant, filename) {
    const parts = ['media', section];
    if (slug)
        parts.push(slug);
    if (variant)
        parts.push(variant);
    if (filename)
        parts.push(filename);
    return parts.join('/');
}
function deriveMeta(key) {
    if (!key.startsWith('media/'))
        return {};
    const parts = key.split('/');
    if (parts.length < 3)
        return {};
    const [, rawSection, ...rest] = parts;
    if (!SECTION_SET.has(rawSection))
        return {};
    const filename = rest[rest.length - 1];
    const middle = rest.slice(0, -1);
    const meta = {
        section: rawSection,
    };
    if (filename)
        meta.filename = filename;
    if (middle.length === 1) {
        if (VARIANT_SET.has(middle[0]))
            meta.variant = middle[0];
        else
            meta.slug = middle[0];
    }
    else if (middle.length >= 2) {
        meta.slug = middle[0];
        if (VARIANT_SET.has(middle[1]))
            meta.variant = middle[1];
    }
    return meta;
}
//# sourceMappingURL=media.service.js.map