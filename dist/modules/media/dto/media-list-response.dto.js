"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaListQuerySchema = exports.MEDIA_VARIANTS = exports.MEDIA_SECTIONS = void 0;
const zod_1 = require("zod");
exports.MEDIA_SECTIONS = [
    'home',
    'destinations',
    'packages',
    'about',
    'rooms',
    'restaurants',
    'transport',
    'testimonials',
];
exports.MEDIA_VARIANTS = ['hero', 'gallery', 'featured', 'thumb'];
exports.mediaListQuerySchema = zod_1.z
    .object({
    prefix: zod_1.z
        .string()
        .trim()
        .min(1)
        .max(512)
        .refine((v) => !v.includes('..') && !v.includes('\\'), {
        message: 'invalid_prefix',
    })
        .optional(),
    section: zod_1.z.enum(exports.MEDIA_SECTIONS).optional(),
    slug: zod_1.z
        .string()
        .trim()
        .min(1)
        .max(120)
        .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, { message: 'invalid_slug' })
        .optional(),
    variant: zod_1.z.enum(exports.MEDIA_VARIANTS).optional(),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional(),
})
    .superRefine((q, ctx) => {
    if (q.prefix)
        return;
    if ((q.slug || q.variant) && !q.section) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['section'],
            message: 'section_required_when_slug_or_variant',
        });
    }
});
//# sourceMappingURL=media-list-response.dto.js.map