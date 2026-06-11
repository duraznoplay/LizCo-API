import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { isUniqueViolation } from '../../../common/utils/pg-error'
import { BlogAdminRepository } from './blog-admin.repository'
import type { BlogQueryDto } from './dto/blog-query.dto'
import type { CreateBlogPostDto } from './dto/create-blog-post.dto'
import type { UpdateBlogPostDto } from './dto/update-blog-post.dto'
import { generateSlug } from './utils/slug.util'
import { calculateReadingTime } from './utils/reading-time.util'
import { BlogStatus } from './dto/blog-status.enum'

@Injectable()
export class BlogAdminService {
  constructor(private readonly repo: BlogAdminRepository) {}

  findAll(query: BlogQueryDto) {
    return this.repo.findAll(query)
  }

  async findById(id: string) {
    const post = await this.repo.findById(id)
    if (!post) throw new NotFoundException(`Blog post ${id} not found`)
    return post
  }

  async findBySlug(slug: string) {
    const post = await this.repo.findBySlug(slug)
    if (!post) throw new NotFoundException(`Blog post ${slug} not found`)
    return post
  }

  async create(dto: CreateBlogPostDto, userId?: string) {
    const slug = dto.slug ?? generateSlug(dto.title)
    await this.assertSlugAvailable(slug)

    const readingTime = calculateReadingTime(dto.content)

    try {
      return await this.repo.create({
        title: dto.title,
        slug,
        content: dto.content,
        image: dto.image,
        status: dto.status ?? BlogStatus.DRAFT,
        meta_description: dto.meta_description,
        meta_keywords: dto.meta_keywords,
        featured: dto.featured ?? false,
        reading_time_minutes: readingTime,
        created_by: userId,
      })
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException('slug_already_exists')
      throw err
    }
  }

  async update(id: string, dto: UpdateBlogPostDto, _userId?: string) {
    const existing = await this.findById(id)

    const payload: Partial<{
      title: string
      slug: string
      content: string
      image: string
      status: BlogStatus
      meta_description: string
      meta_keywords: string
      featured: boolean
      reading_time_minutes: number
      updated_by: string
    }> = {}

    if (dto.title !== undefined) payload.title = dto.title
    if (dto.image !== undefined) payload.image = dto.image
    if (dto.status !== undefined) {
      this.validateStatusTransition(existing.status, dto.status)
      payload.status = dto.status
    }
    if (dto.meta_description !== undefined) payload.meta_description = dto.meta_description
    if (dto.meta_keywords !== undefined) payload.meta_keywords = dto.meta_keywords
    if (dto.featured !== undefined) payload.featured = dto.featured

    // Recalculate reading time if content changes
    if (dto.content !== undefined) {
      payload.content = dto.content
      payload.reading_time_minutes = calculateReadingTime(dto.content)
    }

    // Handle slug
    if (dto.slug !== undefined) {
      await this.assertSlugAvailable(dto.slug, id)
      payload.slug = dto.slug
    } else if (dto.title !== undefined) {
      const newSlug = generateSlug(dto.title)
      const taken = await this.repo.existsBySlug(newSlug, id)
      if (taken) throw new ConflictException('auto_slug_conflict')
      payload.slug = newSlug
    }

    // updated_by skipped until migration 013_fix_blog_fk.sql is applied

    // Empty payload: nothing to change
    if (Object.keys(payload).length === 0) {
      throw new BadRequestException('no_fields_to_update')
    }

    let updated: Awaited<ReturnType<typeof this.repo.update>>
    try {
      updated = await this.repo.update(id, payload)
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException('slug_already_exists')
      throw err
    }

    if (!updated) throw new NotFoundException(`Blog post ${id} not found`)
    return updated
  }

  async delete(id: string) {
    await this.findById(id)
    await this.repo.delete(id)
  }

  async restore(id: string) {
    const post = await this.repo.restore(id)
    if (!post) throw new NotFoundException(`Blog post ${id} not found`)
    return post
  }

  async publish(id: string, userId?: string) {
    return this.transitionStatus(id, BlogStatus.PUBLISHED, userId)
  }

  async archive(id: string, userId?: string) {
    return this.transitionStatus(id, BlogStatus.ARCHIVED, userId)
  }

  async transitionStatus(id: string, newStatus: BlogStatus, _userId?: string) {
    const existing = await this.findById(id)
    this.validateStatusTransition(existing.status, newStatus)

    // updated_by omitted: FK references auth.users but backoffice users live in
    // enterprise_tours.users — fixed by migration 013_fix_blog_fk.sql
    const updated = await this.repo.update(id, { status: newStatus })
    if (!updated) throw new NotFoundException(`Blog post ${id} not found`)
    return updated
  }

  async bulkPublish(ids: string[]) {
    if (!ids.length) throw new BadRequestException('ids must not be empty')
    await this.repo.bulkUpdateStatus(ids, BlogStatus.PUBLISHED)
    return { success: true, count: ids.length }
  }

  async bulkArchive(ids: string[]) {
    if (!ids.length) throw new BadRequestException('ids must not be empty')
    await this.repo.bulkUpdateStatus(ids, BlogStatus.ARCHIVED)
    return { success: true, count: ids.length }
  }

  async getStats() {
    return this.repo.countByStatus()
  }

  private validateStatusTransition(currentStatus: BlogStatus, newStatus: BlogStatus) {
    const validTransitions: Record<BlogStatus, BlogStatus[]> = {
      [BlogStatus.DRAFT]: [BlogStatus.PUBLISHED, BlogStatus.ARCHIVED],
      [BlogStatus.PUBLISHED]: [BlogStatus.ARCHIVED, BlogStatus.DRAFT],
      [BlogStatus.ARCHIVED]: [BlogStatus.DRAFT, BlogStatus.PUBLISHED],
    }

    const allowed = validTransitions[currentStatus]
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowed.join(', ')}`,
      )
    }
  }

  private async assertSlugAvailable(slug: string, excludeId?: string) {
    const exists = await this.repo.existsBySlug(slug, excludeId)
    if (exists) throw new ConflictException('slug_already_exists')
  }
}
