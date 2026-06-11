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
exports.CatalogController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const catalog_service_1 = require("./catalog.service");
const create_addon_dto_1 = require("./dto/create-addon.dto");
const update_addon_dto_1 = require("./dto/update-addon.dto");
let CatalogController = class CatalogController {
    catalog;
    constructor(catalog) {
        this.catalog = catalog;
    }
    destinations() {
        return this.catalog.destinations();
    }
    packages() {
        return this.catalog.packages();
    }
    packageAddOns(slug) {
        return this.catalog.packageAddOns(slug);
    }
    addOns() {
        return this.catalog.allAddOns();
    }
    blogs() {
        return this.catalog.blogs();
    }
    blog(slug) {
        return this.catalog.blog(slug);
    }
    createAddOn(dto) {
        return this.catalog.createAddOn(dto);
    }
    updateAddOn(id, dto) {
        return this.catalog.updateAddOn(id, dto);
    }
    deleteAddOn(id) {
        return this.catalog.deleteAddOn(id);
    }
    addOnDependencies(id) {
        return this.catalog.getAddOnDependencies(id);
    }
};
exports.CatalogController = CatalogController;
__decorate([
    (0, common_1.Get)('destinations'),
    (0, throttler_1.Throttle)({ default: { limit: 120, ttl: 60_000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CatalogController.prototype, "destinations", null);
__decorate([
    (0, common_1.Get)('packages'),
    (0, throttler_1.Throttle)({ default: { limit: 120, ttl: 60_000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CatalogController.prototype, "packages", null);
__decorate([
    (0, common_1.Get)('packages/:slug/add-ons'),
    (0, throttler_1.Throttle)({ default: { limit: 120, ttl: 60_000 } }),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CatalogController.prototype, "packageAddOns", null);
__decorate([
    (0, common_1.Get)('add-ons'),
    (0, throttler_1.Throttle)({ default: { limit: 120, ttl: 60_000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CatalogController.prototype, "addOns", null);
__decorate([
    (0, common_1.Get)('blogs'),
    (0, throttler_1.Throttle)({ default: { limit: 120, ttl: 60_000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CatalogController.prototype, "blogs", null);
__decorate([
    (0, common_1.Get)('blogs/:slug'),
    (0, throttler_1.Throttle)({ default: { limit: 120, ttl: 60_000 } }),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CatalogController.prototype, "blog", null);
__decorate([
    (0, common_1.Post)('add-ons'),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_addon_dto_1.CreateAddOnDto]),
    __metadata("design:returntype", void 0)
], CatalogController.prototype, "createAddOn", null);
__decorate([
    (0, common_1.Patch)('add-ons/:id'),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_addon_dto_1.UpdateAddOnDto]),
    __metadata("design:returntype", void 0)
], CatalogController.prototype, "updateAddOn", null);
__decorate([
    (0, common_1.Delete)('add-ons/:id'),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CatalogController.prototype, "deleteAddOn", null);
__decorate([
    (0, common_1.Get)('add-ons/:id/packages'),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CatalogController.prototype, "addOnDependencies", null);
exports.CatalogController = CatalogController = __decorate([
    (0, common_1.Controller)('catalog'),
    __metadata("design:paramtypes", [catalog_service_1.CatalogService])
], CatalogController);
//# sourceMappingURL=catalog.controller.js.map