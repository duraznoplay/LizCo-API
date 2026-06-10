import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { BlogAdminRepository } from './blog-admin.repository'
import { BlogAdminService } from './blog-admin.service'

const makeRepo = (): jest.Mocked<BlogAdminRepository> =>
  ({
    findAll: jest.fn(),
    findById: jest.fn(),
    existsBySlug: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }) as unknown as jest.Mocked<BlogAdminRepository>

const LONG_CONTENT = 'Contenido mínimo del post para pasar la validación de 50 caracteres.'

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
      repo.create.mockResolvedValue({ id: '1', title: 'Mi Post', slug: 'mi-post' } as never)

      await service.create({ title: 'Mi Post', content: LONG_CONTENT })

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ slug: 'mi-post' }))
    })

    it('uses provided slug instead of auto-generating', async () => {
      repo.existsBySlug.mockResolvedValue(false)
      repo.create.mockResolvedValue({ id: '1', slug: 'custom-slug' } as never)

      await service.create({ title: 'Post', content: LONG_CONTENT, slug: 'custom-slug' })

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ slug: 'custom-slug' }))
    })

    it('throws ConflictException when slug already exists', async () => {
      repo.existsBySlug.mockResolvedValue(true)

      await expect(service.create({ title: 'Duplicado', content: LONG_CONTENT }))
        .rejects.toThrow(ConflictException)
      expect(repo.create).not.toHaveBeenCalled()
    })

    it('converts UNIQUE DB violation into ConflictException (TOCTOU race)', async () => {
      repo.existsBySlug.mockResolvedValue(false)
      repo.create.mockRejectedValue(
        new Error('duplicate key value violates unique constraint "blogs_slug_key"'),
      )

      await expect(service.create({ title: 'Race', content: LONG_CONTENT }))
        .rejects.toThrow(ConflictException)
    })

    it('strips diacritics in auto-generated slug', async () => {
      repo.existsBySlug.mockResolvedValue(false)
      repo.create.mockResolvedValue({ id: '1', slug: 'diversión' } as never)

      await service.create({ title: 'Playas y Diversión', content: LONG_CONTENT })

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'playas-y-diversion' })
      )
    })
  })

  describe('findById', () => {
    it('returns post when found', async () => {
      const post = { id: '1', title: 'Post', slug: 'post', content: 'c', image: null, author: 'LizCo', created_at: '', updated_at: '' }
      repo.findById.mockResolvedValue(post)
      await expect(service.findById('1')).resolves.toEqual(post)
    })

    it('throws NotFoundException when post does not exist', async () => {
      repo.findById.mockResolvedValue(null)
      await expect(service.findById('missing')).rejects.toThrow(NotFoundException)
    })
  })

  describe('update', () => {
    const existing = { id: '1', title: 'Old Title', slug: 'old-title', content: 'c', image: null, author: 'LizCo', created_at: '', updated_at: '' }

    it('throws NotFoundException when post does not exist', async () => {
      repo.findById.mockResolvedValue(null)
      await expect(service.update('missing', { title: 'New' })).rejects.toThrow(NotFoundException)
      expect(repo.update).not.toHaveBeenCalled()
    })

    it('throws BadRequestException when DTO has no recognized fields', async () => {
      repo.findById.mockResolvedValue(existing)

      await expect(service.update('1', {})).rejects.toThrow(BadRequestException)
      expect(repo.update).not.toHaveBeenCalled()
    })

    it('auto-updates slug when title changes and new slug is available', async () => {
      repo.findById.mockResolvedValue(existing)
      repo.existsBySlug.mockResolvedValue(false)
      repo.update.mockResolvedValue({ ...existing, title: 'New Title', slug: 'new-title' } as never)

      await service.update('1', { title: 'New Title' })

      expect(repo.update).toHaveBeenCalledWith('1', expect.objectContaining({ slug: 'new-title' }))
    })

    it('throws ConflictException when auto-generated slug is already taken (supply explicit slug to resolve)', async () => {
      repo.findById.mockResolvedValue(existing)
      repo.existsBySlug.mockResolvedValue(true) // new slug taken

      await expect(service.update('1', { title: 'New Title' }))
        .rejects.toThrow(ConflictException)
      expect(repo.update).not.toHaveBeenCalled()
    })

    it('validates explicit slug uniqueness (throws ConflictException if taken by another)', async () => {
      repo.findById.mockResolvedValue(existing)
      repo.existsBySlug.mockResolvedValue(true)

      await expect(service.update('1', { slug: 'taken-slug' }))
        .rejects.toThrow(ConflictException)
      expect(repo.update).not.toHaveBeenCalled()
    })

    it('converts UNIQUE DB violation into ConflictException during update — explicit slug (TOCTOU race)', async () => {
      repo.findById.mockResolvedValue(existing)
      repo.existsBySlug.mockResolvedValue(false)
      repo.update.mockRejectedValue(
        new Error('duplicate key value violates unique constraint "blogs_slug_key"'),
      )

      await expect(service.update('1', { slug: 'race-slug' }))
        .rejects.toThrow(ConflictException)
    })

    it('converts UNIQUE DB violation into ConflictException during update — auto-slug from title (TOCTOU race)', async () => {
      repo.findById.mockResolvedValue(existing)
      repo.existsBySlug.mockResolvedValue(false)  // auto-slug appears free
      repo.update.mockRejectedValue(
        new Error('duplicate key value violates unique constraint "blogs_slug_key"'),
      )

      // title change triggers auto-slug path; concurrent insert beats us to the DB
      await expect(service.update('1', { title: 'Concurrent Title' }))
        .rejects.toThrow(ConflictException)
    })

    it('throws NotFoundException when post deleted between findById and repo.update (TOCTOU delete)', async () => {
      repo.findById.mockResolvedValue(existing)
      repo.existsBySlug.mockResolvedValue(false)
      repo.update.mockResolvedValue(null as never)  // 0 rows matched — deleted

      await expect(service.update('1', { title: 'Too Late' }))
        .rejects.toThrow(NotFoundException)
    })
  })

  describe('delete', () => {
    it('throws NotFoundException when post does not exist', async () => {
      repo.findById.mockResolvedValue(null)
      await expect(service.delete('missing')).rejects.toThrow(NotFoundException)
      expect(repo.delete).not.toHaveBeenCalled()
    })

    it('calls repo.delete when post exists', async () => {
      const post = { id: '1', title: 'P', slug: 'p', content: 'c', image: null, author: 'LizCo', created_at: '', updated_at: '' }
      repo.findById.mockResolvedValue(post)
      repo.delete.mockResolvedValue(undefined)

      await expect(service.delete('1')).resolves.toBeUndefined()
      expect(repo.delete).toHaveBeenCalledWith('1')
    })
  })
})
