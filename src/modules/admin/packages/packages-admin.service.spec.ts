import { NotFoundException } from '@nestjs/common'
import { PackagesAdminRepository } from './packages-admin.repository'
import { PackagesAdminService } from './packages-admin.service'

const makeRepo = (): jest.Mocked<PackagesAdminRepository> =>
  ({
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }) as unknown as jest.Mocked<PackagesAdminRepository>

describe('PackagesAdminService', () => {
  let service: PackagesAdminService
  let repo: jest.Mocked<PackagesAdminRepository>

  beforeEach(() => {
    repo = makeRepo()
    service = new PackagesAdminService(repo)
  })

  describe('findById', () => {
    it('returns the package when found', async () => {
      const pkg = { id: 'abc', title: 'Test', price: 100, description: 'desc', features: null, created_at: '', updated_at: '' }
      repo.findById.mockResolvedValue(pkg)
      await expect(service.findById('abc')).resolves.toEqual(pkg)
    })

    it('throws NotFoundException when not found', async () => {
      repo.findById.mockResolvedValue(null)
      await expect(service.findById('missing')).rejects.toThrow(NotFoundException)
    })
  })

  describe('create', () => {
    it('delegates to repo.create and returns the result', async () => {
      const pkg = { id: 'new', title: 'Pkg', price: 50, description: 'long desc', features: ['f1'], created_at: '', updated_at: '' }
      repo.create.mockResolvedValue(pkg)
      const result = await service.create({ title: 'Pkg', description: 'long desc', price: 50, features: ['f1'] })
      expect(repo.create).toHaveBeenCalledTimes(1)
      expect(result).toEqual(pkg)
    })
  })

  describe('update', () => {
    it('throws NotFoundException before updating when package does not exist', async () => {
      repo.findById.mockResolvedValue(null)
      await expect(service.update('missing', { price: 99 })).rejects.toThrow(NotFoundException)
      expect(repo.update).not.toHaveBeenCalled()
    })

    it('throws NotFoundException when update returns null (race condition)', async () => {
      const pkg = { id: 'abc', title: 'T', price: 10, description: 'd', features: null, created_at: '', updated_at: '' }
      repo.findById.mockResolvedValue(pkg)
      repo.update.mockResolvedValue(null)
      await expect(service.update('abc', { price: 20 })).rejects.toThrow(NotFoundException)
    })

    it('returns updated package on success', async () => {
      const pkg = { id: 'abc', title: 'T', price: 10, description: 'd', features: null, created_at: '', updated_at: '' }
      const updated = { ...pkg, price: 20 }
      repo.findById.mockResolvedValue(pkg)
      repo.update.mockResolvedValue(updated)
      await expect(service.update('abc', { price: 20 })).resolves.toEqual(updated)
    })
  })

  describe('delete', () => {
    it('throws NotFoundException before deleting when package does not exist', async () => {
      repo.findById.mockResolvedValue(null)
      await expect(service.delete('missing')).rejects.toThrow(NotFoundException)
      expect(repo.delete).not.toHaveBeenCalled()
    })

    it('calls repo.delete when package exists', async () => {
      const pkg = { id: 'abc', title: 'T', price: 10, description: 'd', features: null, created_at: '', updated_at: '' }
      repo.findById.mockResolvedValue(pkg)
      repo.delete.mockResolvedValue(undefined)
      await expect(service.delete('abc')).resolves.toBeUndefined()
      expect(repo.delete).toHaveBeenCalledWith('abc')
    })
  })

  describe('findAll', () => {
    it('delegates to repo.findAll', async () => {
      const result = { data: [], total: 0, page: 1, limit: 20 }
      repo.findAll.mockResolvedValue(result)
      await expect(service.findAll({ page: 1, limit: 20 })).resolves.toEqual(result)
    })
  })
})
