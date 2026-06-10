"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SanitizedExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const SAFE_CODES = new Set([
    'validation_failed',
    'invalid_request_token',
    'invalid_json',
    'method_not_allowed',
    'not_found',
    'forbidden',
    'rate_limited',
    'unauthorized',
    'package_not_found',
    'invalid_package_price',
    'pricing_unavailable',
    'customer_insert_failed',
    'booking_insert_failed',
    'add_ons_load_failed',
    'blog_not_found',
    'catalog_unavailable',
    'captcha_failed',
    'service_unconfigured',
]);
let SanitizedExceptionFilter = class SanitizedExceptionFilter {
    log = new common_1.Logger('Exception');
    catch(exc, host) {
        const http = host.switchToHttp();
        const res = http.getResponse();
        const req = http.getRequest();
        let status = 500;
        let code = 'internal_error';
        let fields;
        if (exc instanceof common_1.HttpException) {
            status = exc.getStatus();
            const response = exc.getResponse();
            if (typeof response === 'string') {
                code = SAFE_CODES.has(response) ? response : mapStatusToCode(status);
            }
            else if (typeof response === 'object' && response !== null) {
                const r = response;
                const candidates = [
                    Array.isArray(r.message) ? r.message[0] : r.message,
                    r.error,
                ].filter((v) => typeof v === 'string');
                code = candidates.find((c) => SAFE_CODES.has(c)) ?? mapStatusToCode(status);
                if (r.fields)
                    fields = r.fields;
            }
            else {
                code = mapStatusToCode(status);
            }
        }
        if (status >= 500) {
            this.log.error({
                msg: 'unhandled_exception',
                path: req.originalUrl,
                method: req.method,
                err: exc instanceof Error ? { name: exc.name, message: exc.message, stack: exc.stack } : String(exc),
            }, 'unhandled_exception');
        }
        res.status(status).json({ ok: false, error: code, ...(fields ? { fields } : {}) });
    }
};
exports.SanitizedExceptionFilter = SanitizedExceptionFilter;
exports.SanitizedExceptionFilter = SanitizedExceptionFilter = __decorate([
    (0, common_1.Injectable)(),
    (0, common_1.Catch)()
], SanitizedExceptionFilter);
function mapStatusToCode(status) {
    if (status === 400)
        return 'validation_failed';
    if (status === 401)
        return 'unauthorized';
    if (status === 403)
        return 'forbidden';
    if (status === 404)
        return 'not_found';
    if (status === 405)
        return 'method_not_allowed';
    if (status === 429)
        return 'rate_limited';
    return 'internal_error';
}
//# sourceMappingURL=sanitized-exception.filter.js.map