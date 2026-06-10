"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingSubmitSchema = exports.quoteQuerySchema = void 0;
const zod_1 = require("zod");
exports.quoteQuerySchema = zod_1.z.object({
    packageSlug: zod_1.z.string().trim().min(1).max(200),
    date: zod_1.z
        .string()
        .trim()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
    pax: zod_1.z.coerce.number().int().min(1).max(50).default(2),
    tourId: zod_1.z.string().trim().max(200).optional(),
});
exports.bookingSubmitSchema = zod_1.z
    .object({
    packageSlug: zod_1.z.string().trim().min(1).max(200),
    travelDateIso: zod_1.z.string().trim().min(1).max(40),
    adults: zod_1.z.coerce.number().int().min(1).max(50),
    children: zod_1.z.coerce.number().int().min(0).max(50),
    paymentMode: zod_1.z.enum(['deposit', 'full']),
    guestFirstName: zod_1.z.string().trim().min(1).max(100),
    guestLastName: zod_1.z.string().trim().min(1).max(100),
    guestEmail: zod_1.z.string().trim().email().max(150),
    guestPhone: zod_1.z.string().trim().max(20).optional().or(zod_1.z.literal('')),
    selectedAddOnIds: zod_1.z.array(zod_1.z.string().min(1).max(64)).max(32),
    captchaToken: zod_1.z.string().trim().max(4000).optional(),
})
    .superRefine((val, ctx) => {
    const d = new Date(val.travelDateIso);
    if (Number.isNaN(d.getTime())) {
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: 'Invalid travel date', path: ['travelDateIso'] });
        return;
    }
    const travel = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (travel < today) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'Travel date cannot be in the past',
            path: ['travelDateIso'],
        });
    }
});
//# sourceMappingURL=booking.dto.js.map