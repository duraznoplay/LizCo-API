import { z } from 'zod'

export const assistantTourCatalogSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  language: z.enum(['en', 'es', 'fr']).default('en'),
})
export type AssistantTourCatalog = z.infer<typeof assistantTourCatalogSchema>

export type AssistantTourCatalogSuccessNoDbResponseDto = {
  ok: true
  usedDb: false
  reply: ''
}

export type AssistantTourCatalogSuccessDbResponseDto = {
  ok: true
  usedDb: true
  reply: string
}

export type AssistantTourCatalogErrorResponseDto = {
  ok: false
  error: 'internal_error'
}

export type AssistantTourCatalogResponseDto =
  | AssistantTourCatalogSuccessNoDbResponseDto
  | AssistantTourCatalogSuccessDbResponseDto
  | AssistantTourCatalogErrorResponseDto
