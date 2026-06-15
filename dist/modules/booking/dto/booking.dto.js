"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingSubmitSchema = exports.quoteQuerySchema = void 0;
const zod_1 = require("zod");
const ymd = zod_1.z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD');
const uuid = zod_1.z.string().trim().uuid();
const childrenAgesCsv = zod_1.z
    .string()
    .trim()
    .max(200)
    .transform((s) => (s ? s.split(',').map((x) => Number(x.trim())) : []))
    .pipe(zod_1.z.array(zod_1.z.number().int().min(0).max(17)).max(20));
exports.quoteQuerySchema = zod_1.z
    .object({
    packageSlug: zod_1.z.string().trim().min(1).max(200),
    departureId: uuid.optional(),
    date: ymd.optional(),
    returnDate: ymd.optional(),
    hotelId: uuid.optional(),
    occupancy: zod_1.z.enum(['multiple', 'double', 'single']).default('multiple'),
    adults: zod_1.z.coerce.number().int().min(1).max(50).optional(),
    pax: zod_1.z.coerce.number().int().min(1).max(50).optional(),
    childrenAges: childrenAgesCsv.optional(),
    nights: zod_1.z.coerce.number().int().refine((n) => n === 3 || n === 4, 'nights must be 3 or 4').optional(),
    season: zod_1.z.enum(['regular', 'alta']).optional(),
    tourId: zod_1.z.string().trim().max(200).optional(),
})
    .superRefine((val, ctx) => {
    if (!val.departureId && !val.date && !(val.hotelId && val.nights && val.season)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'departureId, date, or (hotelId + nights + season) is required',
            path: ['departureId'],
        });
    }
});
exports.bookingSubmitSchema = zod_1.z
    .object({
    packageSlug: zod_1.z.string().trim().min(1).max(200),
    departureId: uuid.optional(),
    travelDateIso: zod_1.z.string().trim().min(1).max(40).optional(),
    returnDate: ymd.optional(),
    hotelId: uuid.optional(),
    occupancy: zod_1.z.enum(['multiple', 'double', 'single']).default('multiple'),
    nights: zod_1.z.coerce.number().int().refine((n) => n === 3 || n === 4, 'nights must be 3 or 4').optional(),
    season: zod_1.z.enum(['regular', 'alta']).optional(),
    adults: zod_1.z.coerce.number().int().min(1).max(50),
    childrenAges: zod_1.z.array(zod_1.z.coerce.number().int().min(0).max(17)).max(20).optional(),
    children: zod_1.z.coerce.number().int().min(0).max(50).default(0),
    paymentMode: zod_1.z.enum(['deposit', 'full']),
    guestFirstName: zod_1.z.string().trim().min(1).max(100),
    guestLastName: zod_1.z.string().trim().min(1).max(100),
    guestEmail: zod_1.z.string().trim().email().max(150),
    guestPhone: zod_1.z.string().trim().max(20).optional().or(zod_1.z.literal('')),
    guestCountry: zod_1.z.string().trim().max(80).optional(),
    specialRequests: zod_1.z.string().trim().max(2000).optional(),
    selectedAddOnIds: zod_1.z.array(zod_1.z.string().min(1).max(64)).max(32),
    captchaToken: zod_1.z.string().trim().max(4000).optional(),
})
    .superRefine((val, ctx) => {
    if (!val.departureId && !val.travelDateIso && !(val.hotelId && val.nights && val.season)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'departureId, travelDateIso, or (hotelId + nights + season) is required',
            path: ['departureId'],
        });
        return;
    }
    if (val.travelDateIso) {
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
    }
});
//# sourceMappingURL=booking.dto.js.map