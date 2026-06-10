"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackagesAdminModule = void 0;
const common_1 = require("@nestjs/common");
const roles_guard_1 = require("../../../common/guards/roles.guard");
const auth_module_1 = require("../../auth/auth.module");
const packages_admin_controller_1 = require("./packages-admin.controller");
const packages_admin_repository_1 = require("./packages-admin.repository");
const packages_admin_service_1 = require("./packages-admin.service");
let PackagesAdminModule = class PackagesAdminModule {
};
exports.PackagesAdminModule = PackagesAdminModule;
exports.PackagesAdminModule = PackagesAdminModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.BackofficeAuthModule],
        controllers: [packages_admin_controller_1.PackagesAdminController],
        providers: [packages_admin_service_1.PackagesAdminService, packages_admin_repository_1.PackagesAdminRepository, roles_guard_1.RolesGuard],
    })
], PackagesAdminModule);
//# sourceMappingURL=packages-admin.module.js.map