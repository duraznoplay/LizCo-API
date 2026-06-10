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
exports.PackagesAdminService = void 0;
const common_1 = require("@nestjs/common");
const slug_util_1 = require("../../../common/utils/slug.util");
const packages_admin_repository_1 = require("./packages-admin.repository");
let PackagesAdminService = class PackagesAdminService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    findAll(query) {
        return this.repo.findAll(query);
    }
    async findById(id) {
        const pkg = await this.repo.findById(id);
        if (!pkg)
            throw new common_1.NotFoundException(`Package ${id} not found`);
        return pkg;
    }
    async create(dto) {
        const rawSlug = dto.slug ?? (0, slug_util_1.generateSlug)(dto.name);
        const slug = await this.resolveUniqueSlug(rawSlug);
        const payload = {
            ...dto,
            slug,
            is_active: dto.is_active ?? true,
        };
        return this.repo.create(payload);
    }
    async update(id, dto) {
        const existing = await this.findById(id);
        const payload = { ...dto };
        if (dto.slug && dto.slug !== existing.slug) {
            const exists = await this.repo.existsBySlug(dto.slug, id);
            if (exists)
                throw new common_1.ConflictException('slug_conflict');
            payload.slug = dto.slug;
        }
        else if (dto.name && dto.name !== existing.name && !dto.slug) {
            const generated = (0, slug_util_1.generateSlug)(dto.name);
            if (generated !== existing.slug) {
                payload.slug = await this.resolveUniqueSlug(generated, id);
            }
        }
        const updated = await this.repo.update(id, payload);
        if (!updated)
            throw new common_1.NotFoundException(`Package ${id} not found`);
        return updated;
    }
    async delete(id) {
        const pkg = await this.findById(id);
        if (!pkg)
            throw new common_1.NotFoundException(`Package ${id} not found`);
        await this.repo.delete(id);
    }
    async findDestinations() {
        return this.repo.findDestinations();
    }
    async resolveUniqueSlug(base, excludeId) {
        let candidate = base;
        let n = 2;
        while (await this.repo.existsBySlug(candidate, excludeId)) {
            candidate = `${base}-${n}`;
            n++;
        }
        return candidate;
    }
};
exports.PackagesAdminService = PackagesAdminService;
exports.PackagesAdminService = PackagesAdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [packages_admin_repository_1.PackagesAdminRepository])
], PackagesAdminService);
//# sourceMappingURL=packages-admin.service.js.map