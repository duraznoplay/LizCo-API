import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
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
    return this.repo.create({ title: dto.title, slug, content: dto.content, image: dto.image })
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
      if (!taken) payload.slug = newSlug
    }

    return this.repo.update(id, payload)
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
