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
exports.BlogAdminController = void 0;
const common_1 = require("@nestjs/common");
const jwt_admin_guard_1 = require("../../../common/guards/jwt-admin.guard");
const roles_guard_1 = require("../../../common/guards/roles.guard");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const blog_admin_service_1 = require("./blog-admin.service");
const blog_query_dto_1 = require("./dto/blog-query.dto");
const create_blog_post_dto_1 = require("./dto/create-blog-post.dto");
const update_blog_post_dto_1 = require("./dto/update-blog-post.dto");
let BlogAdminController = class BlogAdminController {
    service;
    constructor(service) {
        this.service = service;
    }
    async stats() {
        const counts = await this.service.getStats();
        return {
            total: counts.draft + counts.published + counts.archived,
            draft: counts.draft,
            published: counts.published,
            archived: counts.archived,
        };
    }
    findAll(q) {
        return this.service.findAll(q);
    }
    findById(id) {
        return this.service.findById(id);
    }
    create(dto, user) {
        return this.service.create(dto, user?.id);
    }
    async bulkPublish(body) {
        return this.service.bulkPublish(body.ids);
    }
    async bulkArchive(body) {
        return this.service.bulkArchive(body.ids);
    }
    update(id, dto, user) {
        return this.service.update(id, dto, user?.id);
    }
    async publish(id, user) {
        return this.service.publish(id, user?.id);
    }
    async archive(id, user) {
        return this.service.archive(id, user?.id);
    }
    async restore(id) {
        return this.service.restore(id);
    }
    async remove(id) {
        await this.service.delete(id);
    }
};
exports.BlogAdminController = BlogAdminController;
__decorate([
    (0, common_1.Get)('stats'),
    (0, roles_decorator_1.Roles)('ADMIN', 'STAFF'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BlogAdminController.prototype, "stats", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('ADMIN', 'STAFF'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [blog_query_dto_1.BlogQueryDto]),
    __metadata("design:returntype", void 0)
], BlogAdminController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN', 'STAFF'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BlogAdminController.prototype, "findById", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(201),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_blog_post_dto_1.CreateBlogPostDto, Object]),
    __metadata("design:returntype", void 0)
], BlogAdminController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('bulk/publish'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BlogAdminController.prototype, "bulkPublish", null);
__decorate([
    (0, common_1.Post)('bulk/archive'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BlogAdminController.prototype, "bulkArchive", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_blog_post_dto_1.UpdateBlogPostDto, Object]),
    __metadata("design:returntype", void 0)
], BlogAdminController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/publish'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BlogAdminController.prototype, "publish", null);
__decorate([
    (0, common_1.Post)(':id/archive'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BlogAdminController.prototype, "archive", null);
__decorate([
    (0, common_1.Post)(':id/restore'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BlogAdminController.prototype, "restore", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(204),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BlogAdminController.prototype, "remove", null);
exports.BlogAdminController = BlogAdminController = __decorate([
    (0, common_1.Controller)('admin/blogs'),
    (0, common_1.UseGuards)(jwt_admin_guard_1.JwtAdminGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [blog_admin_service_1.BlogAdminService])
], BlogAdminController);
//# sourceMappingURL=blog-admin.controller.js.map