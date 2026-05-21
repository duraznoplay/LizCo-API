import { z } from 'zod'

export type MediaListItemDto = {
  key: string
  url: string
  size?: number
  lastModified?: string
  section?: string
  slug?: string
  variant?: string
  filename?: string
}

export type MediaListResponseDto = {
  items: MediaListItemDto[]
}

export const MEDIA_SECTIONS = [
  'home',
  'destinations',
  'packages',
  'about',
  'rooms',
  'restaurants',
  'transport',
  'testimonials',
] as const

export const MEDIA_VARIANTS = ['hero', 'gallery', 'featured', 'thumb'] as const

export const mediaListQuerySchema = z
  .object({
    prefix: z
      .string()
      .trim()
      .min(1)
      .max(512)
      .refine((v) => !v.includes('..') && !v.includes('\\'), {
        message: 'invalid_prefix',
      })
      .optional(),
    section: z.enum(MEDIA_SECTIONS).optional(),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, { message: 'invalid_slug' })
      .optional(),
    variant: z.enum(MEDIA_VARIANTS).optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
  .superRefine((q, ctx) => {
    if (q.prefix) return
    if ((q.slug || q.variant) && !q.section) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['section'],
        message: 'section_required_when_slug_or_variant',
      })
    }
  })

export type MediaListQueryDto = z.infer<typeof mediaListQuerySchema>
