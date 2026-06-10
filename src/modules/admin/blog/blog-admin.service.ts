import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { isUniqueViolation } from '../../../common/utils/pg-error'
import { BlogAdminRepository } from './blog-admin.repository'
import type { BlogQueryDto } from './dto/blog-query.dto'
import type { CreateBlogPostDto } from './dto/create-blog-post.dto'
import type { UpdateBlogPostDto } from './dto/update-blog-post.dto'
import { generateSlug } from './utils/slug.util'

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

  async create(dto: CreateBlogPostDto) {
    const slug = dto.slug ?? generateSlug(dto.title)
    await this.assertSlugAvailable(slug)
    try {
      return await this.repo.create({ title: dto.title, slug, content: dto.content, image: dto.image })
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException('slug_already_exists')
      throw err
    }
  }

  async update(id: string, dto: UpdateBlogPostDto) {
    await this.findById(id)

    const payload: Partial<{ title: string; slug: string; content: string; image: string }> = {}
    if (dto.title !== undefined) payload.title = dto.title
    if (dto.content !== undefined) payload.content = dto.content
    if (dto.image !== undefined) payload.image = dto.image

    if (dto.slug !== undefined) {
      await this.assertSlugAvailable(dto.slug, id)
      payload.slug = dto.slug
    } else if (dto.title !== undefined) {
      const newSlug = generateSlug(dto.title)
      const taken = await this.repo.existsBySlug(newSlug, id)
      if (taken) throw new ConflictException('auto_slug_conflict')
      payload.slug = newSlug
    }

    // Empty payload: nothing to change — return current state without hitting the DB.
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

    // repo.update returns null when 0 rows matched — post was deleted in the TOCTOU window.
    if (!updated) throw new NotFoundException(`Blog post ${id} not found`)
    return updated
  }

  async delete(id: string) {
    await this.findById(id)
    await this.repo.delete(id)
  }

  private async assertSlugAvailable(slug: string, excludeId?: string) {
    const exists = await this.repo.existsBySlug(slug, excludeId)
    if (exists) throw new ConflictException('slug_already_exists')
  }
}
