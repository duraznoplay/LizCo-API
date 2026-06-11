/**
 * Calculate reading time in minutes based on word count.
 * Average reading speed is ~200 words per minute.
 * Minimum is 1 minute.
 */
export function calculateReadingTime(content: string): number {
  if (!content) return 1
  const wordCount = content.split(/\s+/).filter(word => word.length > 0).length
  const readingTime = Math.ceil(wordCount / 200)
  return Math.max(1, readingTime)
}
