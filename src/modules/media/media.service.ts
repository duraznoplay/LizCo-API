import { DeleteObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
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
import type { CreateMediaDto, PresignedUrlRequestDto, PresignedUrlResponseDto, UpdateMediaDto } from './dto/media-admin.dto'
import { MediaMetadataRepository } from './media-metadata.repository'

const SECTION_SET: ReadonlySet<string> = new Set(MEDIA_SECTIONS)
const VARIANT_SET: ReadonlySet<string> = new Set(MEDIA_VARIANTS)

@Injectable()
export class MediaService {
  private readonly log = new Logger(MediaService.name)

  constructor(
    @Inject(MEDIA_S3_CLIENT) private readonly s3: S3Client,
    private readonly config: ConfigService<AppEnv, true>,
    private readonly metadataRepo: MediaMetadataRepository,
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

  async generatePresignedUrl(
    req: PresignedUrlRequestDto,
  ): Promise<PresignedUrlResponseDto> {
    const bucket = this.config.get('S3_BUCKET_NAME', { infer: true })
    if (!bucket) throw new ServiceUnavailableException('s3_not_configured')

    const key = buildS3Key(req.section, req.slug, req.variant, req.filename)
    const contentType = req.contentType || 'image/jpeg'

    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
      })

      const url = await getSignedUrl(this.s3, command, { expiresIn: 900 }) // 15 min

      return {
        url,
        key,
        expiresIn: 900,
      }
    } catch {
      throw new BadGatewayException('presigned_url_generation_failed')
    }
  }

  async createMetadata(
    s3_key: string,
    data: CreateMediaDto,
    sizeBytes?: number,
    contentType?: string,
  ) {
    return this.metadataRepo.create({
      ...data,
      s3_key,
      size_bytes: sizeBytes,
      content_type: contentType,
    })
  }

  async getMetadata(id: string) {
    return this.metadataRepo.findById(id)
  }

  async getMetadataByKey(s3_key: string) {
    return this.metadataRepo.findByKey(s3_key)
  }

  async listMetadata(filters?: {
    section?: string
    slug?: string
    variant?: string
    limit?: number
    offset?: number
  }) {
    return this.metadataRepo.findAll(filters)
  }

  async listMediaFromS3(filters?: {
    section?: string
    slug?: string
    variant?: string
    limit?: number
    offset?: number
  }): Promise<{
    items: Array<{
      id?: string
      s3_key: string
      url: string
      section: string
      slug?: string
      variant?: string
      title?: string
      size_bytes?: number
      lastModified?: string
      filename?: string
    }>
    total: number
  }> {
    const bucket = this.config.get('S3_BUCKET_NAME', { infer: true })
    const domain = this.config.get('CLOUDFRONT_DOMAIN', { infer: true })
    if (!bucket || !domain) throw new ServiceUnavailableException('s3_not_configured')

    const resolvedPrefix = this.buildPrefix(filters)
    const limit = filters?.limit || 10
    const offset = filters?.offset || 0

    try {
      // Get total count first
      const countResult = await this.s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: resolvedPrefix,
        }),
      )
      const total = countResult.Contents?.length || 0

      // Get paginated results
      const out = await this.s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: resolvedPrefix,
          MaxKeys: limit + offset, // Need to fetch offset + limit to skip
        }),
      )

      const allItems = (out.Contents ?? []).slice(offset, offset + limit)

      const items = await Promise.all(
        allItems.map(async (c) => {
          const key = c.Key
          if (!key) return null

          const meta = deriveMeta(key)
          const metadata = await this.metadataRepo.findByKey(key)

          return {
            id: metadata?.id,
            s3_key: key,
            url: `https://${domain}/${encodeURI(key)}`,
            section: meta.section || 'unknown',
            slug: meta.slug || metadata?.slug || undefined,
            variant: meta.variant || metadata?.variant || undefined,
            title: metadata?.title || undefined,
            size_bytes: c.Size,
            lastModified: c.LastModified?.toISOString(),
            filename: meta.filename,
          }
        }),
      )

      return {
        items: items.filter((x): x is NonNullable<typeof x> => x !== null),
        total,
      }
    } catch {
      throw new BadGatewayException('s3_list_failed')
    }
  }

  private buildPrefix(filters?: { section?: string; slug?: string; variant?: string }): string {
    if (!filters?.section) return 'media/'
    let prefix = `media/${filters.section}/`
    if (filters.slug) prefix += `${filters.slug}/`
    if (filters.variant) prefix += `${filters.variant}/`
    return prefix
  }

  async updateMetadata(id: string, data: UpdateMediaDto) {
    return this.metadataRepo.update(id, data)
  }

  async deleteFile(s3_key: string) {
    const bucket = this.config.get('S3_BUCKET_NAME', { infer: true })
    if (!bucket) throw new ServiceUnavailableException('s3_not_configured')

    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: s3_key,
        }),
      )
      await this.metadataRepo.deleteByKey(s3_key)
    } catch {
      throw new BadGatewayException('media_deletion_failed')
    }
  }

  async deleteById(id: string) {
    const metadata = await this.metadataRepo.findById(id)
    if (!metadata) throw new Error('metadata_not_found')

    const bucket = this.config.get('S3_BUCKET_NAME', { infer: true })
    if (!bucket) throw new ServiceUnavailableException('s3_not_configured')

    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: metadata.s3_key,
        }),
      )
      await this.metadataRepo.delete(id)
    } catch {
      throw new BadGatewayException('media_deletion_failed')
    }
  }

  async uploadFile(
    section: string,
    slug: string | undefined,
    variant: string | undefined,
    filename: string,
    contentType: string,
    buffer: Buffer,
  ): Promise<{ key: string; size: number }> {
    const bucket = this.config.get('S3_BUCKET_NAME', { infer: true })
    if (!bucket) throw new ServiceUnavailableException('s3_not_configured')

    const key = buildS3Key(section, slug, variant, filename)

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      )

      return {
        key,
        size: buffer.length,
      }
    } catch {
      throw new BadGatewayException('media_upload_failed')
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

function buildS3Key(
  section: string,
  slug?: string,
  variant?: string,
  filename?: string,
): string {
  const parts = ['media', section]
  if (slug) parts.push(slug)
  if (variant) parts.push(variant)
  if (filename) parts.push(filename)
  return parts.join('/')
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
