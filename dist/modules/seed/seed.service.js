"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SeedService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcrypt"));
const supabase_admin_service_1 = require("../../supabase/supabase-admin.service");
const BCRYPT_ROUNDS = 12;
let SeedService = SeedService_1 = class SeedService {
    config;
    supabase;
    logger = new common_1.Logger(SeedService_1.name);
    constructor(config, supabase) {
        this.config = config;
        this.supabase = supabase;
    }
    async onApplicationBootstrap() {
        await this.seedAdminUser();
    }
    async seedAdminUser() {
        const email = this.config.get('ADMIN_EMAIL');
        const rawPassword = this.config.get('ADMIN_PASSWORD');
        if (!email || !rawPassword) {
            this.logger.warn('[SeedService] ADMIN_EMAIL or ADMIN_PASSWORD not set. Skipping seed.');
            return;
        }
        const { count, error: countError } = await this.supabase.client
            .schema(supabase_admin_service_1.ENTERPRISE_TOURS_SCHEMA)
            .from('users')
            .select('id', { count: 'exact', head: true });
        if (countError) {
            this.logger.error('[SeedService] Error checking users table:', countError.message);
            return;
        }
        if ((count ?? 0) > 0) {
            this.logger.log('[SeedService] Admin already exists, skipping seed.');
            return;
        }
        const passwordHash = await bcrypt.hash(rawPassword, BCRYPT_ROUNDS);
        const { error: insertError } = await this.supabase.client
            .schema(supabase_admin_service_1.ENTERPRISE_TOURS_SCHEMA)
            .from('users')
            .insert({ email, password: passwordHash, role: 'ADMIN' });
        if (insertError) {
            this.logger.error('[SeedService] Error creating admin user:', insertError.message);
            return;
        }
        this.logger.log(`[SeedService] Admin user created: ${email}`);
    }
};
exports.SeedService = SeedService;
exports.SeedService = SeedService = SeedService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        supabase_admin_service_1.SupabaseAdminService])
], SeedService);
//# sourceMappingURL=seed.service.js.map