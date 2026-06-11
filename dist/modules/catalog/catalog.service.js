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
exports.CatalogService = void 0;
const common_1 = require("@nestjs/common");
const catalog_repository_1 = require("./catalog.repository");
let CatalogService = class CatalogService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async destinations() {
        try {
            return { items: await this.repo.listDestinations() };
        }
        catch {
            throw new common_1.ServiceUnavailableException('catalog_unavailable');
        }
    }
    async packages() {
        try {
            return { items: await this.repo.listPackages() };
        }
        catch {
            throw new common_1.ServiceUnavailableException('catalog_unavailable');
        }
    }
    async packageAddOns(packageSlug) {
        try {
            return { packageSlug, items: await this.repo.listAddOnsForPackageSlug(packageSlug) };
        }
        catch {
            throw new common_1.ServiceUnavailableException('catalog_unavailable');
        }
    }
    async allAddOns() {
        try {
            return { items: await this.repo.listAllAddOns() };
        }
        catch {
            throw new common_1.ServiceUnavailableException('catalog_unavailable');
        }
    }
    async blogs() {
        try {
            return { items: await this.repo.listBlogs() };
        }
        catch {
            throw new common_1.ServiceUnavailableException('catalog_unavailable');
        }
    }
    async blog(slug) {
        try {
            const row = await this.repo.blogBySlug(slug);
            if (!row)
                throw new common_1.NotFoundException('blog_not_found');
            return row;
        }
        catch (e) {
            if (e instanceof common_1.NotFoundException)
                throw e;
            throw new common_1.ServiceUnavailableException('catalog_unavailable');
        }
    }
    async listAddOnsForPackageSlug(packageSlug) {
        return this.repo.listAddOnsForPackageSlug(packageSlug);
    }
    async createAddOn(dto) {
        try {
            return await this.repo.createAddOn({
                id: dto.id,
                name: dto.name,
                type: dto.type,
                price: Number(dto.price),
                is_active: dto.is_active ?? true,
            });
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : '';
            if (msg.includes('duplicate') || msg.includes('Unique violation')) {
                throw new common_1.ConflictException('ADD_ON_ALREADY_EXISTS');
            }
            throw new common_1.ServiceUnavailableException('catalog_unavailable');
        }
    }
    async updateAddOn(id, dto) {
        try {
            const payload = {};
            if (dto.name !== undefined)
                payload.name = dto.name;
            if (dto.type !== undefined)
                payload.type = dto.type;
            if (dto.price !== undefined)
                payload.price = Number(dto.price);
            if (dto.is_active !== undefined)
                payload.is_active = dto.is_active;
            return await this.repo.updateAddOn(id, payload);
        }
        catch (error) {
            throw new common_1.ServiceUnavailableException('catalog_unavailable');
        }
    }
    async deleteAddOn(id) {
        try {
            const packages = await this.repo.getAddOnDependencies(id);
            if (packages.length > 0) {
                throw new common_1.ConflictException({
                    code: 'ADD_ON_IN_USE',
                    message: 'Cannot delete add-on that is associated with packages',
                    packages_using: packages,
                });
            }
            await this.repo.deleteAddOn(id);
            return { success: true, deleted_id: id };
        }
        catch (error) {
            if (error instanceof common_1.ConflictException)
                throw error;
            throw new common_1.ServiceUnavailableException('catalog_unavailable');
        }
    }
    async getAddOnDependencies(id) {
        try {
            const packages = await this.repo.getAddOnDependencies(id);
            return { packages_using: packages };
        }
        catch {
            throw new common_1.ServiceUnavailableException('catalog_unavailable');
        }
    }
};
exports.CatalogService = CatalogService;
exports.CatalogService = CatalogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [catalog_repository_1.CatalogRepository])
], CatalogService);
//# sourceMappingURL=catalog.service.js.map