export type DestinationRow = {
  name: string
  slug: string
  description: string | null
}

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
