"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackofficeAuthModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const jwt_admin_guard_1 = require("../../common/guards/jwt-admin.guard");
const users_module_1 = require("../users/users.module");
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const jwt_admin_strategy_1 = require("./strategies/jwt-admin.strategy");
const local_strategy_1 = require("./strategies/local.strategy");
let BackofficeAuthModule = class BackofficeAuthModule {
};
exports.BackofficeAuthModule = BackofficeAuthModule;
exports.BackofficeAuthModule = BackofficeAuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            passport_1.PassportModule,
            jwt_1.JwtModule.register({}),
            users_module_1.UsersModule,
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [auth_service_1.AuthService, local_strategy_1.LocalStrategy, jwt_admin_strategy_1.JwtAdminStrategy, jwt_admin_guard_1.JwtAdminGuard],
        exports: [jwt_admin_strategy_1.JwtAdminStrategy, jwt_admin_guard_1.JwtAdminGuard],
    })
], BackofficeAuthModule);
//# sourceMappingURL=auth.module.js.map