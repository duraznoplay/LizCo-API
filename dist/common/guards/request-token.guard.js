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
var RequestTokenGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestTokenGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const public_decorator_1 = require("../decorators/public.decorator");
const skip_request_token_decorator_1 = require("../decorators/skip-request-token.decorator");
const request_token_service_1 = require("../../crypto/request-token.service");
let RequestTokenGuard = RequestTokenGuard_1 = class RequestTokenGuard {
    reflector;
    tokenSvc;
    log = new common_1.Logger(RequestTokenGuard_1.name);
    constructor(reflector, tokenSvc) {
        this.reflector = reflector;
        this.tokenSvc = tokenSvc;
    }
    async canActivate(ctx) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            ctx.getHandler(),
            ctx.getClass(),
        ]);
        if (isPublic)
            return true;
        const skipRequestToken = this.reflector.getAllAndOverride(skip_request_token_decorator_1.SKIP_REQUEST_TOKEN_KEY, [
            ctx.getHandler(),
            ctx.getClass(),
        ]);
        if (skipRequestToken)
            return true;
        const req = ctx.switchToHttp().getRequest();
        const tokenHeader = req.headers['x-lizco-request-token'];
        const token = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader;
        if (!token || typeof token !== 'string') {
            throw new common_1.UnauthorizedException('invalid_request_token');
        }
        const pathOnly = (req.originalUrl ?? req.url ?? '/').split('?')[0];
        const methodUpper = req.method.toUpperCase();
        const rawBody = methodUpper === 'GET' || methodUpper === 'HEAD'
            ? Buffer.alloc(0)
            : req.rawBody instanceof Buffer
                ? req.rawBody
                : Buffer.from(req.body === undefined || req.body === null
                    ? ''
                    : typeof req.body === 'string'
                        ? req.body
                        : JSON.stringify(req.body));
        try {
            req.requestToken = await this.tokenSvc.verify({
                token,
                method: req.method,
                path: pathOnly,
                rawBody,
            });
            return true;
        }
        catch (err) {
            this.log.warn({
                msg: 'request_token_rejected',
                reason: err instanceof Error ? err.message : 'unknown',
                path: pathOnly,
                method: req.method,
            });
            throw new common_1.UnauthorizedException('invalid_request_token');
        }
    }
};
exports.RequestTokenGuard = RequestTokenGuard;
exports.RequestTokenGuard = RequestTokenGuard = RequestTokenGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        request_token_service_1.RequestTokenService])
], RequestTokenGuard);
//# sourceMappingURL=request-token.guard.js.map