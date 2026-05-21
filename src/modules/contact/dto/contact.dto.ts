import { z } from 'zod'

const contactSubjectEnum = z.enum(['booking', 'custom', 'info', 'support', 'other'])

export const contactFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  email: z.string().trim().email('Enter a valid email').max(150),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  subject: contactSubjectEnum,
  message: z.string().trim().min(1, 'Message is required').max(8000),
  captchaToken: z.string().trim().max(4000).optional(),
})
export type ContactForm = z.infer<typeof contactFormSchema>

export type ContactSubmitResponseDto = {
  ok: true
}

export const newsletterFormSchema = z.object({
  email: z.string().trim().email('Enter a valid email').max(150),
  captchaToken: z.string().trim().max(4000).optional(),
})
export type NewsletterForm = z.infer<typeof newsletterFormSchema>

export type NewsletterSubscribeResponseDto = {
  ok: true
}
