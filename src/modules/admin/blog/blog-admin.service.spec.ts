import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { BlogAdminRepository } from './blog-admin.repository'
import { BlogAdminService } from './blog-admin.service'
import { BlogStatus } from './dto/blog-status.enum'

const makeRepo = (): jest.Mocked<BlogAdminRepository> =>
  ({
    findAll: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
    existsBySlug: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    restore: jest.fn(),
    bulkUpdateStatus: jest.fn(),
    countByStatus: jest.fn(),
  }) as unknown as jest.Mocked<BlogAdminRepository>

const LONG_CONTENT = 'Contenido mínimo del post para pasar la validación de 50 caracteres.'

const mockPost = (overrides?: Partial<any>): any => ({
  id: '1',
  title: 'Post Title',
  slug: 'post-title',
  content: LONG_CONTENT,
  image: null,
  author: 'LizCo',
  status: BlogStatus.DRAFT,
  meta_description: null,
  meta_keywords: null,
  featured: false,
  reading_time_minutes: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  deleted_at: null,
  ...overrides,
})

describe('BlogAdminService', () => {
  let service: BlogAdminService
  let repo: jest.Mocked<BlogAdminRepository>

  beforeEach(() => {
    repo = makeRepo()
    service = new BlogAdminService(repo)
  })

  describe('create', () => {
    it('auto-generates slug from title when no slug provided', async () => {
      repo.existsBySlug.mockResolvedValue(false)
      repo.create.mockResolvedValue(mockPost({ slug: 'mi-post' }))

      await service.create({ title: 'Mi Post', content: LONG_CONTENT })

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ slug: 'mi-post' }))
    })

    it('calculates reading_time from content length', async () => {
      repo.existsBySlug.mockResolvedValue(false)
      repo.create.mockResolvedValue(mockPost({ reading_time_minutes: 5 }))

      const longContent = 'word '.repeat(1000)
      await service.create({ title: 'Post', content: longContent })

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ reading_time_minutes: 5 }))
    })

    it('sets status to draft by default', async () => {
      repo.existsBySlug.mockResolvedValue(false)
      repo.create.mockResolvedValue(mockPost())

      await service.create({ title: 'Post', content: LONG_CONTENT })

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ status: BlogStatus.DRAFT }))
    })

    it('throws ConflictException when slug already exists', async () => {
      repo.existsBySlug.mockResolvedValue(true)

      await expect(service.create({ title: 'Duplicado', content: LONG_CONTENT })).rejects.toThrow(ConflictException)
      expect(repo.create).not.toHaveBeenCalled()
    })
  })

  describe('findById', () => {
    it('returns post when found', async () => {
      const post = mockPost()
      repo.findById.mockResolvedValue(post)
      await expect(service.findById('1')).resolves.toEqual(post)
    })

    it('throws NotFoundException when post does not exist', async () => {
      repo.findById.mockResolvedValue(null)
      await expect(service.findById('missing')).rejects.toThrow(NotFoundException)
    })
  })

  describe('update', () => {
    it('recalculates reading_time when content changes', async () => {
      const existing = mockPost({ reading_time_minutes: 1 })
      repo.findById.mockResolvedValue(existing)
      const newContent = 'word '.repeat(2000)
      repo.update.mockResolvedValue(mockPost({ reading_time_minutes: 10 }))

      await service.update('1', { content: newContent })

      expect(repo.update).toHaveBeenCalledWith('1', expect.objectContaining({ reading_time_minutes: 10 }))
    })

    it('throws BadRequestException when DTO has no recognized fields', async () => {
      repo.findById.mockResolvedValue(mockPost())

      await expect(service.update('1', {})).rejects.toThrow(BadRequestException)
      expect(repo.update).not.toHaveBeenCalled()
    })

    it('throws NotFoundException when post does not exist', async () => {
      repo.findById.mockResolvedValue(null)

      await expect(service.update('missing', { title: 'New' })).rejects.toThrow(NotFoundException)
      expect(repo.update).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('calls repo.delete when post exists', async () => {
      repo.findById.mockResolvedValue(mockPost())
      repo.delete.mockResolvedValue(undefined)

      await expect(service.delete('1')).resolves.toBeUndefined()
      expect(repo.delete).toHaveBeenCalledWith('1')
    })

    it('throws NotFoundException when post does not exist', async () => {
      repo.findById.mockResolvedValue(null)

      await expect(service.delete('missing')).rejects.toThrow(NotFoundException)
      expect(repo.delete).not.toHaveBeenCalled()
    })
  })

  describe('Status Transitions (HU-001)', () => {
    it('publishes a draft post', async () => {
      const draft = mockPost({ status: BlogStatus.DRAFT })
      repo.findById.mockResolvedValue(draft)
      repo.update.mockResolvedValue(mockPost({ status: BlogStatus.PUBLISHED }))

      const result = await service.publish('1')

      expect(result.status).toBe(BlogStatus.PUBLISHED)
      expect(repo.update).toHaveBeenCalledWith('1', expect.objectContaining({ status: BlogStatus.PUBLISHED }))
    })

    it('archives a published post', async () => {
      const published = mockPost({ status: BlogStatus.PUBLISHED })
      repo.findById.mockResolvedValue(published)
      repo.update.mockResolvedValue(mockPost({ status: BlogStatus.ARCHIVED }))

      const result = await service.archive('1')

      expect(result.status).toBe(BlogStatus.ARCHIVED)
    })

    it('rejects invalid status transitions', async () => {
      const published = mockPost({ status: BlogStatus.PUBLISHED })
      repo.findById.mockResolvedValue(published)

      // Published → PUBLISHED should fail
      await expect(service.transitionStatus('1', BlogStatus.PUBLISHED)).rejects.toThrow(BadRequestException)
      expect(repo.update).not.toHaveBeenCalled()
    })
  })

  describe('Bulk Operations (HU-006)', () => {
    it('publishes multiple blogs at once', async () => {
      const ids = ['1', '2', '3']
      repo.bulkUpdateStatus.mockResolvedValue(undefined)

      const result = await service.bulkPublish(ids)

      expect(result).toEqual({ success: true, count: 3 })
      expect(repo.bulkUpdateStatus).toHaveBeenCalledWith(ids, BlogStatus.PUBLISHED)
    })

    it('archives multiple blogs at once', async () => {
      const ids = ['1', '2', '3']
      repo.bulkUpdateStatus.mockResolvedValue(undefined)

      const result = await service.bulkArchive(ids)

      expect(result).toEqual({ success: true, count: 3 })
      expect(repo.bulkUpdateStatus).toHaveBeenCalledWith(ids, BlogStatus.ARCHIVED)
    })

    it('throws BadRequestException when bulk operation has empty ids', async () => {
      await expect(service.bulkPublish([])).rejects.toThrow(BadRequestException)
      expect(repo.bulkUpdateStatus).not.toHaveBeenCalled()
    })
  })

  describe('Soft Delete & Restore (HU-004)', () => {
    it('restores a deleted blog post', async () => {
      const post = mockPost({ deleted_at: null })
      repo.restore.mockResolvedValue(post)

      const result = await service.restore('1')

      expect(result.deleted_at).toBeNull()
      expect(repo.restore).toHaveBeenCalledWith('1')
    })

    it('throws NotFoundException when post to restore does not exist', async () => {
      repo.restore.mockResolvedValue(null)

      await expect(service.restore('missing')).rejects.toThrow(NotFoundException)
    })
  })

  describe('SEO Metadata (HU-002)', () => {
    it('saves meta_description and meta_keywords on create', async () => {
      repo.existsBySlug.mockResolvedValue(false)
      repo.create.mockResolvedValue(mockPost({ meta_description: 'A great post', meta_keywords: 'blog, travel' }))

      await service.create({
        title: 'Post',
        content: LONG_CONTENT,
        meta_description: 'A great post',
        meta_keywords: 'blog, travel',
      })

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          meta_description: 'A great post',
          meta_keywords: 'blog, travel',
        }),
      )
    })

    it('updates meta fields without changing other fields', async () => {
      const existing = mockPost()
      repo.findById.mockResolvedValue(existing)
      repo.update.mockResolvedValue(mockPost({ meta_description: 'Updated', meta_keywords: 'new' }))

      await service.update('1', { meta_description: 'Updated', meta_keywords: 'new' })

      expect(repo.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          meta_description: 'Updated',
          meta_keywords: 'new',
        }),
      )
    })
  })

  describe('Stats & Dashboard', () => {
    it('retrieves status counts for dashboard KPIs', async () => {
      repo.countByStatus.mockResolvedValue({
        [BlogStatus.DRAFT]: 5,
        [BlogStatus.PUBLISHED]: 10,
        [BlogStatus.ARCHIVED]: 2,
      })

      const stats = await service.getStats()

      expect(stats).toEqual({
        draft: 5,
        published: 10,
        archived: 2,
      })
    })
  })
})
