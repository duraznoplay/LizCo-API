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
var KeyRingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyRingService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jose_1 = require("jose");
let KeyRingService = KeyRingService_1 = class KeyRingService {
    config;
    log = new common_1.Logger(KeyRingService_1.name);
    entries = [];
    constructor(config) {
        this.config = config;
    }
    async onModuleInit() {
        const raws = [
            this.config.get('LIZCO_API_REQUEST_PRIVKEY_JWK'),
            this.config.get('LIZCO_API_REQUEST_PRIVKEY_JWK_PREV'),
        ];
        const loaded = [];
        for (const raw of raws) {
            if (!raw)
                continue;
            try {
                const jwk = JSON.parse(raw);
                if (!jwk.kid)
                    throw new Error('jwk missing kid');
                const key = (await (0, jose_1.importJWK)(jwk, jwk.alg ?? 'ECDH-ES'));
                loaded.push({ kid: jwk.kid, key });
            }
            catch (err) {
                this.log.error({ err }, 'failed to import JWE private key');
            }
        }
        if (loaded.length === 0) {
            throw new Error('no_jwe_keys_loaded');
        }
        this.entries = loaded;
        this.log.log(`JWE key-ring loaded (${loaded.length} key(s): ${loaded.map((e) => e.kid).join(', ')})`);
    }
    findByKid(kid) {
        if (!kid)
            return null;
        return this.entries.find((e) => e.kid === kid) ?? null;
    }
    get size() {
        return this.entries.length;
    }
};
exports.KeyRingService = KeyRingService;
exports.KeyRingService = KeyRingService = KeyRingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], KeyRingService);
//# sourceMappingURL=key-ring.service.js.map