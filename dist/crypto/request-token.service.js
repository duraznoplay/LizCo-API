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
var RequestTokenService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestTokenService = void 0;
const common_1 = require("@nestjs/common");
const jose_1 = require("jose");
const node_crypto_1 = require("node:crypto");
const lru_cache_1 = require("lru-cache");
const key_ring_service_1 = require("./key-ring.service");
let RequestTokenService = RequestTokenService_1 = class RequestTokenService {
    keyRing;
    log = new common_1.Logger(RequestTokenService_1.name);
    seenJti = new lru_cache_1.LRUCache({
        max: 5_000,
        ttl: 60_000,
    });
    constructor(keyRing) {
        this.keyRing = keyRing;
    }
    async verify(opts) {
        const { token, method, path, rawBody } = opts;
        try {
            const { payload, protectedHeader } = await (0, jose_1.jwtDecrypt)(token, async (header) => {
                const entry = this.keyRing.findByKid(header.kid);
                if (!entry)
                    throw new Error('unknown_kid');
                return entry.key;
            }, {
                issuer: 'lizco-web',
                audience: 'lizco-api',
                clockTolerance: 5,
            });
            if (protectedHeader.alg !== 'ECDH-ES' || protectedHeader.enc !== 'A256GCM') {
                throw new Error('bad_alg');
            }
            if (payload.method !== method)
                throw new Error('method_mismatch');
            if (payload.path !== path)
                throw new Error('path_mismatch');
            const computed = (0, node_crypto_1.createHash)('sha256').update(rawBody).digest('hex');
            if (payload.bodyHash !== computed)
                throw new Error('body_hash_mismatch');
            const jti = payload.jti;
            if (!jti)
                throw new Error('missing_jti');
            if (this.seenJti.has(jti))
                throw new Error('replay');
            this.seenJti.set(jti, Date.now());
            return payload;
        }
        catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            this.log.error(`Token verification failed: ${errMsg}`);
            throw err;
        }
    }
};
exports.RequestTokenService = RequestTokenService;
exports.RequestTokenService = RequestTokenService = RequestTokenService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [key_ring_service_1.KeyRingService])
], RequestTokenService);
//# sourceMappingURL=request-token.service.js.map