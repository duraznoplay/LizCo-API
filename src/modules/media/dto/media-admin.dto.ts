import { z } from 'zod'

export const createMediaSchema = z.object({
  section: z.enum([
    'home',
    'destinations',
    'packages',
    'about',
    'rooms',
    'restaurants',
    'transport',
    'testimonials',
  ] as const),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, { message: 'invalid_slug' })
    .optional(),
  variant: z
    .enum(['hero', 'gallery', 'featured', 'thumb'] as const)
    .optional(),
  title: z.string().max(255).optional(),
  description: z.string().max(1000).optional(),
  alt_text: z.string().max(255).optional(),
})

export type CreateMediaDto = z.infer<typeof createMediaSchema>

export const updateMediaSchema = createMediaSchema.partial()

export type UpdateMediaDto = z.infer<typeof updateMediaSchema>

export const presignedUrlSchema = z.object({
  filename: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .refine((v) => !v.includes('..') && !v.includes('/'), { message: 'invalid_filename' }),
  contentType: z
    .string()
    .regex(/^image\/.+$/, { message: 'only_images_allowed' })
    .optional(),
  section: z.enum([
    'home',
    'destinations',
    'packages',
    'about',
    'rooms',
    'restaurants',
    'transport',
    'testimonials',
  ] as const),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, { message: 'invalid_slug' })
    .optional(),
  variant: z
    .enum(['hero', 'gallery', 'featured', 'thumb'] as const)
    .optional(),
})

export type PresignedUrlRequestDto = z.infer<typeof presignedUrlSchema>

export type PresignedUrlResponseDto = {
  url: string
  key: string
  expiresIn: number
}

export type MediaDetailDto = {
  id: string
  s3_key: string
  section: string
  slug?: string
  variant?: string
  title?: string
  description?: string
  alt_text?: string
  size_bytes?: number
  content_type?: string
  url: string
  created_at: string
  updated_at: string
}

export type MediaListAdminDto = {
  items: MediaDetailDto[]
  total?: number
}
