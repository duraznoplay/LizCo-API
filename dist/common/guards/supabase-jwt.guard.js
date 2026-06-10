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
var SupabaseJwtGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseJwtGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jose_1 = require("jose");
let SupabaseJwtGuard = SupabaseJwtGuard_1 = class SupabaseJwtGuard {
    config;
    log = new common_1.Logger(SupabaseJwtGuard_1.name);
    jwks;
    issuer;
    constructor(config) {
        this.config = config;
        const jwksUrl = this.config.getOrThrow('SUPABASE_JWKS_URL');
        const supabaseUrl = this.config.getOrThrow('SUPABASE_URL');
        this.jwks = (0, jose_1.createRemoteJWKSet)(new URL(jwksUrl));
        this.issuer = `${supabaseUrl.replace(/\/$/, '')}/auth/v1`;
    }
    async canActivate(ctx) {
        const req = ctx.switchToHttp().getRequest();
        const header = req.headers.authorization;
        if (!header || typeof header !== 'string' || !header.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('unauthorized');
        }
        try {
            const { payload } = await (0, jose_1.jwtVerify)(header.slice(7), this.jwks, {
                issuer: this.issuer,
                audience: 'authenticated',
            });
            const claims = payload;
            req.user = {
                id: String(claims.sub ?? ''),
                role: claims.role ?? 'authenticated',
            };
            return true;
        }
        catch (err) {
            this.log.warn({ msg: 'supabase_jwt_invalid', reason: err instanceof Error ? err.message : 'unknown' });
            throw new common_1.UnauthorizedException('unauthorized');
        }
    }
};
exports.SupabaseJwtGuard = SupabaseJwtGuard;
exports.SupabaseJwtGuard = SupabaseJwtGuard = SupabaseJwtGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SupabaseJwtGuard);
//# sourceMappingURL=supabase-jwt.guard.js.map