"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.presignedUrlSchema = exports.updateMediaSchema = exports.createMediaSchema = void 0;
const zod_1 = require("zod");
exports.createMediaSchema = zod_1.z.object({
    section: zod_1.z.enum([
        'home',
        'destinations',
        'packages',
        'about',
        'rooms',
        'restaurants',
        'transport',
        'testimonials',
    ]),
    slug: zod_1.z
        .string()
        .trim()
        .min(1)
        .max(120)
        .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, { message: 'invalid_slug' })
        .optional(),
    variant: zod_1.z
        .enum(['hero', 'gallery', 'featured', 'thumb'])
        .optional(),
    title: zod_1.z.string().max(255).optional(),
    description: zod_1.z.string().max(1000).optional(),
    alt_text: zod_1.z.string().max(255).optional(),
});
exports.updateMediaSchema = exports.createMediaSchema.partial();
exports.presignedUrlSchema = zod_1.z.object({
    filename: zod_1.z
        .string()
        .trim()
        .min(1)
        .max(255)
        .refine((v) => !v.includes('..') && !v.includes('/'), { message: 'invalid_filename' }),
    contentType: zod_1.z
        .string()
        .regex(/^image\/.+$/, { message: 'only_images_allowed' })
        .optional(),
    section: zod_1.z.enum([
        'home',
        'destinations',
        'packages',
        'about',
        'rooms',
        'restaurants',
        'transport',
        'testimonials',
    ]),
    slug: zod_1.z
        .string()
        .trim()
        .min(1)
        .max(120)
        .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, { message: 'invalid_slug' })
        .optional(),
    variant: zod_1.z
        .enum(['hero', 'gallery', 'featured', 'thumb'])
        .optional(),
});
//# sourceMappingURL=media-admin.dto.js.map