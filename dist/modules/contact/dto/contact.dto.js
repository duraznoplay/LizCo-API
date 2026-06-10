"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newsletterFormSchema = exports.contactFormSchema = void 0;
const zod_1 = require("zod");
const contactSubjectEnum = zod_1.z.enum(['booking', 'custom', 'info', 'support', 'other']);
exports.contactFormSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1, 'Name is required').max(200),
    email: zod_1.z.string().trim().email('Enter a valid email').max(150),
    phone: zod_1.z.string().trim().max(40).optional().or(zod_1.z.literal('')),
    subject: contactSubjectEnum,
    message: zod_1.z.string().trim().min(1, 'Message is required').max(8000),
    captchaToken: zod_1.z.string().trim().max(4000).optional(),
});
exports.newsletterFormSchema = zod_1.z.object({
    email: zod_1.z.string().trim().email('Enter a valid email').max(150),
    captchaToken: zod_1.z.string().trim().max(4000).optional(),
});
//# sourceMappingURL=contact.dto.js.map