import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import {
  BadGatewayException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import type { AppEnv } from '../../config/env.schema'
import type { MediaListItemDto, MediaListQueryDto, MediaListResponseDto } from './dto/media-list-response.dto'
import { MEDIA_SECTIONS, MEDIA_VARIANTS } from './dto/media-list-response.dto'
import { MEDIA_S3_CLIENT } from './providers/s3-client.provider'

const SECTION_SET: ReadonlySet<string> = new Set(MEDIA_SECTIONS)
const VARIANT_SET: ReadonlySet<string> = new Set(MEDIA_VARIANTS)

@Injectable()
export class MediaService {
  private readonly log = new Logger(MediaService.name)

  constructor(
    @Inject(MEDIA_S3_CLIENT) private readonly s3: S3Client,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  async listMedia(query: MediaListQueryDto = {}): Promise<MediaListResponseDto> {
    const bucket = this.config.get('S3_BUCKET_NAME', { infer: true })
    const domain = this.config.get('CLOUDFRONT_DOMAIN', { infer: true })
    const region = this.config.get('AWS_REGION', { infer: true })
    const accessKeyId = this.config.get('AWS_ACCESS_KEY_ID', { infer: true })
    const secretAccessKey = this.config.get('AWS_SECRET_ACCESS_KEY', { infer: true })
    if (!bucket || !domain || !region || !accessKeyId || !secretAccessKey) {
      throw new ServiceUnavailableException('media_not_configured')
    }

    const resolvedPrefix = resolvePrefix(query)
    this.log.log({ msg: 'media_list', prefix: resolvedPrefix, limit: query.limit ?? null })

    try {
      const out = await this.s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: resolvedPrefix,
          ...(query.limit ? { MaxKeys: query.limit } : {}),
        }),
      )
      let items: MediaListItemDto[] = (out.Contents ?? [])
        .map((c) => {
          const key = c.Key
          if (!key) return null
          const item: MediaListItemDto = {
            key,
            url: `https://${domain}/${encodeURI(key)}`,
          }
          if (c.Size !== undefined) item.size = c.Size
          if (c.LastModified) item.lastModified = c.LastModified.toISOString()
          const meta = deriveMeta(key)
          if (meta.section) item.section = meta.section
          if (meta.slug) item.slug = meta.slug
          if (meta.variant) item.variant = meta.variant
          if (meta.filename) item.filename = meta.filename
          return item
        })
        .filter((x): x is MediaListItemDto => x !== null)

      if (query.limit && items.length > query.limit) {
        items = items.slice(0, query.limit)
      }

      return { items }
    } catch {
      throw new BadGatewayException('media_list_failed')
    }
  }
}

function resolvePrefix(q: MediaListQueryDto): string {  
  if (q.prefix !== undefined) return q.prefix
  if (!q.section) return ''
  let prefix = `media/${q.section}/`
  if (q.slug) prefix += `${q.slug}/`
  if (q.variant) prefix += `${q.variant}/`
  return prefix
}

function deriveMeta(key: string): {
  section?: string
  slug?: string
  variant?: string
  filename?: string
} {
  if (!key.startsWith('media/')) return {}
  const parts = key.split('/')
  if (parts.length < 3) return {}

  const [, rawSection, ...rest] = parts
  if (!SECTION_SET.has(rawSection)) return {}

  const filename = rest[rest.length - 1]
  const middle = rest.slice(0, -1)

  const meta: { section?: string; slug?: string; variant?: string; filename?: string } = {
    section: rawSection,
  }

  if (filename) meta.filename = filename

  if (middle.length === 1) {
    if (VARIANT_SET.has(middle[0])) meta.variant = middle[0]
    else meta.slug = middle[0]
  } else if (middle.length >= 2) {
    meta.slug = middle[0]
    if (VARIANT_SET.has(middle[1])) meta.variant = middle[1]
  }

  return meta
}
