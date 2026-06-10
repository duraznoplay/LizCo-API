export const PG_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
} as const

/**
 * Detects PostgreSQL UNIQUE constraint violations.
 * Works when the original pg/Supabase error has been re-wrapped as a plain Error
 * (code lost) — falls back to checking the message string for "duplicate key".
 */
export function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const e = error as Error & { code?: string }
  if (e.code === PG_ERROR_CODES.UNIQUE_VIOLATION) return true
  return (
    e.message.includes('duplicate key') ||
    e.message.includes('23505') ||
    e.message.includes('unique constraint')
  )
}

/**
 * Wraps a Supabase PostgrestError preserving its code field so isUniqueViolation()
 * can use the authoritative pg error code instead of message-string matching.
 */
export function pgError(error: { message: string; code?: string }): Error {
  return Object.assign(new Error(error.message), { code: error.code })
}
