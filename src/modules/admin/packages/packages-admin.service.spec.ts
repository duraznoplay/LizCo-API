import { ConflictException, NotFoundException } from '@nestjs/common'
import { PackagesAdminRepository } from './packages-admin.repository'
import { PackagesAdminService } from './packages-admin.service'

const makeRepo = (): jest.Mocked<PackagesAdminRepository> =>
  ({
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    existsBySlug: jest.fn(),
    findDestinations: jest.fn(),
  }) as unknown as jest.Mocked<PackagesAdminRepository>

const mockPackage = {
  id: 'pkg-1',
  name: 'Colombia Coffee Tour',
  slug: 'colombia-coffee-tour',
  description: 'Explore the coffee triangle',
  base_price: 1500,
  duration_days: 5,
  duration_nights: 4,
  is_active: true,
  destination_id: 'dest-1',
  features: ['Guide included', 'Meals'],
  image: 'https://example.com/image.jpg',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('PackagesAdminService', () => {
  let service: PackagesAdminService
  let repo: jest.Mocked<PackagesAdminRepository>

  beforeEach(() => {
    repo = makeRepo()
    service = new PackagesAdminService(repo)
  })

  describe('findById', () => {
    it('returns the package when found', async () => {
      repo.findById.mockResolvedValue(mockPackage)
      await expect(service.findById('pkg-1')).resolves.toEqual(mockPackage)
    })

    it('throws NotFoundException when not found', async () => {
      repo.findById.mockResolvedValue(null)
      await expect(service.findById('missing')).rejects.toThrow(NotFoundException)
    })
  })

  describe('create', () => {
    it('auto-generates slug from name when no slug provided', async () => {
      const dto = {
        name: 'Colombia Coffee Tour',
        description: 'Explore the coffee triangle',
        base_price: 1500,
        duration_days: 5,
      }
      repo.existsBySlug.mockResolvedValue(false)
      repo.create.mockResolvedValue(mockPackage)

      await service.create(dto)

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Colombia Coffee Tour',
          slug: 'colombia-coffee-tour',
          is_active: true,
        }),
      )
    })

    it('uses provided slug instead of auto-generating', async () => {
      const dto = {
        name: 'Colombia Coffee Tour',
        slug: 'custom-slug',
        base_price: 1500,
        duration_days: 5,
      }
      repo.existsBySlug.mockResolvedValue(false)
      repo.create.mockResolvedValue(mockPackage)

      await service.create(dto)

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ slug: 'custom-slug' }))
    })

    it('appends -2 when slug already exists', async () => {
      const dto = {
        name: 'Colombia Coffee Tour',
        base_price: 1500,
        duration_days: 5,
      }
      repo.existsBySlug.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
      repo.create.mockResolvedValue({ ...mockPackage, slug: 'colombia-coffee-tour-2' })

      await service.create(dto)

      expect(repo.existsBySlug).toHaveBeenCalledWith('colombia-coffee-tour', undefined)
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'colombia-coffee-tour-2' }),
      )
    })
  })

  describe('update', () => {
    it('throws NotFoundException before updating when package does not exist', async () => {
      repo.findById.mockResolvedValue(null)
      await expect(service.update('missing', { name: 'New' })).rejects.toThrow(NotFoundException)
      expect(repo.update).not.toHaveBeenCalled()
    })

    it('throws NotFoundException when update returns null (race condition)', async () => {
      repo.findById.mockResolvedValue(mockPackage)
      repo.update.mockResolvedValue(null)
      await expect(service.update('pkg-1', { base_price: 2000 })).rejects.toThrow(NotFoundException)
    })

    it('auto-updates slug when name changes and no explicit slug provided', async () => {
      repo.findById.mockResolvedValue(mockPackage)
      repo.existsBySlug.mockResolvedValue(false)
      const updated = { ...mockPackage, name: 'Brazil Adventure', slug: 'brazil-adventure' }
      repo.update.mockResolvedValue(updated)

      await service.update('pkg-1', { name: 'Brazil Adventure' })

      expect(repo.update).toHaveBeenCalledWith('pkg-1', expect.objectContaining({ slug: 'brazil-adventure' }))
    })

    it('throws ConflictException when explicit slug is already taken by another package', async () => {
      repo.findById.mockResolvedValue(mockPackage)
      repo.existsBySlug.mockResolvedValue(true)

      await expect(service.update('pkg-1', { slug: 'taken-slug' })).rejects.toThrow(ConflictException)
      expect(repo.update).not.toHaveBeenCalled()
    })

    it('returns updated package on success', async () => {
      repo.findById.mockResolvedValue(mockPackage)
      const updated = { ...mockPackage, base_price: 2000 }
      repo.update.mockResolvedValue(updated)

      const result = await service.update('pkg-1', { base_price: 2000 })

      expect(result).toEqual(updated)
    })
  })

  describe('delete', () => {
    it('throws NotFoundException before deleting when package does not exist', async () => {
      repo.findById.mockResolvedValue(null)
      await expect(service.delete('missing')).rejects.toThrow(NotFoundException)
      expect(repo.delete).not.toHaveBeenCalled()
    })

    it('calls repo.delete when package exists', async () => {
      repo.findById.mockResolvedValue(mockPackage)
      repo.delete.mockResolvedValue(undefined)

      await expect(service.delete('pkg-1')).resolves.toBeUndefined()
      expect(repo.delete).toHaveBeenCalledWith('pkg-1')
    })
  })

  describe('findAll', () => {
    it('delegates to repo.findAll', async () => {
      const result = { data: [mockPackage], total: 1, page: 1, limit: 20 }
      repo.findAll.mockResolvedValue(result)

      const res = await service.findAll({ page: 1, limit: 20 })

      expect(res).toEqual(result)
    })
  })

  describe('findDestinations', () => {
    it('returns list of destinations', async () => {
      const destinations = [
        { id: 'dest-1', name: 'Colombia', slug: 'colombia' },
        { id: 'dest-2', name: 'Brazil', slug: 'brazil' },
      ]
      repo.findDestinations.mockResolvedValue(destinations)

      const result = await service.findDestinations()

      expect(result).toEqual(destinations)
    })
  })
})
