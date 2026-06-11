import { BlogStatus } from '../dto/blog-status.enum'

export interface BlogPostEntity {
  id: string
  title: string
  slug: string
  content: string
  image: string | null
  author: string
  status: BlogStatus
  meta_description: string | null
  meta_keywords: string | null
  featured: boolean
  reading_time_minutes: number
  created_at: string
  updated_at: string
  deleted_at: string | null
  created_by?: string | null
  updated_by?: string | null
}
