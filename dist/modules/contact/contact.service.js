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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactService = void 0;
const common_1 = require("@nestjs/common");
const supabase_admin_service_1 = require("../../supabase/supabase-admin.service");
const captcha_service_1 = require("./integrations/captcha.service");
let ContactService = class ContactService {
    supa;
    captcha;
    constructor(supa, captcha) {
        this.supa = supa;
        this.captcha = captcha;
    }
    async submitContact(data) {
        await this.captcha.verify(data.captchaToken);
        const row = {
            name: data.name,
            email: data.email,
            phone: data.phone?.trim() ? data.phone.trim() : null,
            subject: data.subject,
            message: data.message,
        };
        const { error } = await this.supa.client
            .schema(supabase_admin_service_1.ENTERPRISE_TOURS_SCHEMA)
            .from('contact_leads')
            .insert(row);
        if (error)
            throw new common_1.InternalServerErrorException('internal_error');
        return { ok: true };
    }
    async subscribeNewsletter(data) {
        await this.captcha.verify(data.captchaToken);
        const { error } = await this.supa.client
            .schema(supabase_admin_service_1.ENTERPRISE_TOURS_SCHEMA)
            .from('newsletter_subscribers')
            .upsert({ email: data.email.toLowerCase() }, { onConflict: 'email' });
        if (error)
            throw new common_1.InternalServerErrorException('internal_error');
        return { ok: true };
    }
};
exports.ContactService = ContactService;
exports.ContactService = ContactService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_admin_service_1.SupabaseAdminService,
        captcha_service_1.CaptchaService])
], ContactService);
//# sourceMappingURL=contact.service.js.map