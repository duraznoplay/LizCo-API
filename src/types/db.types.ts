export type PackageListRow = {
  name: string
  slug: string
  base_price: number
  duration_days: number
  duration_nights: number | null
  destinations: { name: string; slug: string }[] | null
}

export type PackageIdRow = {
  id: string
}

export type BlogPublicListItem = {
  slug: string
  title: string
  excerpt: string | null
  published_at: string | null
}

export type BlogPublicDetail = BlogPublicListItem & {
  body: string
}

export type BlogAdminListItem = {
  id: string
  title: string
  slug: string
  image: string | null
  author: string
  created_at: string
}

export type BlogAdminRow = BlogAdminListItem & {
  content: string
  updated_at: string
}

export type PackageAdminRow = {
  id: string
  name: string
  slug: string
  description: string | null
  base_price: number
  duration_days: number
  duration_nights: number | null
  is_active: boolean
  destination_id: string | null
  features: string[] | null
  image: string | null
  created_at: string
  updated_at: string
  destinations?: { id: string; name: string; slug: string }[] | null
}

export type DestinationRow = {
  id: string
  name: string
  slug: string
}
