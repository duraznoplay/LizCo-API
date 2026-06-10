"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogAdminModule = void 0;
const common_1 = require("@nestjs/common");
const roles_guard_1 = require("../../../common/guards/roles.guard");
const auth_module_1 = require("../../auth/auth.module");
const blog_admin_controller_1 = require("./blog-admin.controller");
const blog_admin_repository_1 = require("./blog-admin.repository");
const blog_admin_service_1 = require("./blog-admin.service");
let BlogAdminModule = class BlogAdminModule {
};
exports.BlogAdminModule = BlogAdminModule;
exports.BlogAdminModule = BlogAdminModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.BackofficeAuthModule],
        controllers: [blog_admin_controller_1.BlogAdminController],
        providers: [blog_admin_service_1.BlogAdminService, blog_admin_repository_1.BlogAdminRepository, roles_guard_1.RolesGuard],
    })
], BlogAdminModule);
//# sourceMappingURL=blog-admin.module.js.map