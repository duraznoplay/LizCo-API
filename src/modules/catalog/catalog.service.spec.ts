import { ConflictException, ServiceUnavailableException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { CatalogRepository } from './catalog.repository'
import { CatalogService } from './catalog.service'
import { CreateAddOnDto } from './dto/create-addon.dto'
import { UpdateAddOnDto } from './dto/update-addon.dto'

describe('CatalogService', () => {
  it('returns destinations from repository', async () => {
    const repo: Pick<CatalogRepository, 'listDestinations'> = {
      listDestinations: jest.fn().mockResolvedValue([{ name: 'X', slug: 'x', description: null }]),
    }
    const mod = await Test.createTestingModule({
      providers: [CatalogService, { provide: CatalogRepository, useValue: repo }],
    }).compile()
    const svc = mod.get(CatalogService)
    await expect(svc.destinations()).resolves.toEqual({
      items: [{ name: 'X', slug: 'x', description: null }],
    })
    expect(repo.listDestinations).toHaveBeenCalled()
  })

  describe('createAddOn', () => {
    it('creates add-on and returns it', async () => {
      const mockAddOn = { id: 'A1', name: 'Transport', type: 'PER_BOOKING', price: 50, is_active: true }
      const repo = {
        createAddOn: jest.fn().mockResolvedValue(mockAddOn),
      } as unknown as Pick<CatalogRepository, 'createAddOn'>

      const mod = await Test.createTestingModule({
        providers: [CatalogService, { provide: CatalogRepository, useValue: repo }],
      }).compile()
      const svc = mod.get(CatalogService)

      const dto: CreateAddOnDto = {
        id: 'A1',
        name: 'Transport',
        type: 'PER_BOOKING' as any,
        price: 50,
        is_active: true,
      }
      await expect(svc.createAddOn(dto)).resolves.toEqual(mockAddOn)
      expect(repo.createAddOn).toHaveBeenCalledWith({
        id: 'A1',
        name: 'Transport',
        type: 'PER_BOOKING',
        price: 50,
        is_active: true,
      })
    })

    it('throws ConflictException if ID already exists', async () => {
      const repo = {
        createAddOn: jest.fn().mockRejectedValue(new Error('Unique violation')),
      } as unknown as Pick<CatalogRepository, 'createAddOn'>

      const mod = await Test.createTestingModule({
        providers: [CatalogService, { provide: CatalogRepository, useValue: repo }],
      }).compile()
      const svc = mod.get(CatalogService)

      const dto: CreateAddOnDto = {
        id: 'A1',
        name: 'Transport',
        type: 'PER_BOOKING' as any,
        price: 50,
        is_active: true,
      }
      await expect(svc.createAddOn(dto)).rejects.toThrow(ConflictException)
    })
  })

  describe('updateAddOn', () => {
    it('updates add-on and returns it', async () => {
      const mockUpdated = { id: 'A1', name: 'Updated', type: 'PER_BOOKING', price: 60, is_active: true }
      const repo = {
        updateAddOn: jest.fn().mockResolvedValue(mockUpdated),
      } as unknown as Pick<CatalogRepository, 'updateAddOn'>

      const mod = await Test.createTestingModule({
        providers: [CatalogService, { provide: CatalogRepository, useValue: repo }],
      }).compile()
      const svc = mod.get(CatalogService)

      const dto: UpdateAddOnDto = { name: 'Updated', price: 60 }
      await expect(svc.updateAddOn('A1', dto)).resolves.toEqual(mockUpdated)
      expect(repo.updateAddOn).toHaveBeenCalledWith('A1', {
        name: 'Updated',
        price: 60,
      })
    })
  })

  describe('deleteAddOn', () => {
    it('deletes add-on if no dependencies', async () => {
      const repo = {
        getAddOnDependencies: jest.fn().mockResolvedValue([]),
        deleteAddOn: jest.fn().mockResolvedValue(undefined),
      } as unknown as Pick<CatalogRepository, 'getAddOnDependencies' | 'deleteAddOn'>

      const mod = await Test.createTestingModule({
        providers: [CatalogService, { provide: CatalogRepository, useValue: repo }],
      }).compile()
      const svc = mod.get(CatalogService)

      await expect(svc.deleteAddOn('A1')).resolves.toEqual({
        success: true,
        deleted_id: 'A1',
      })
      expect(repo.deleteAddOn).toHaveBeenCalledWith('A1')
    })

    it('throws ConflictException if dependencies exist', async () => {
      const packages = [{ id: '123', name: 'Cartagena', slug: 'cartagena' }]
      const repo = {
        getAddOnDependencies: jest.fn().mockResolvedValue(packages),
      } as unknown as Pick<CatalogRepository, 'getAddOnDependencies'>

      const mod = await Test.createTestingModule({
        providers: [CatalogService, { provide: CatalogRepository, useValue: repo }],
      }).compile()
      const svc = mod.get(CatalogService)

      await expect(svc.deleteAddOn('A1')).rejects.toThrow(ConflictException)
    })
  })

  describe('getAddOnDependencies', () => {
    it('returns packages using the add-on', async () => {
      const packages = [{ id: '123', name: 'Cartagena', slug: 'cartagena' }]
      const repo = {
        getAddOnDependencies: jest.fn().mockResolvedValue(packages),
      } as unknown as Pick<CatalogRepository, 'getAddOnDependencies'>

      const mod = await Test.createTestingModule({
        providers: [CatalogService, { provide: CatalogRepository, useValue: repo }],
      }).compile()
      const svc = mod.get(CatalogService)

      await expect(svc.getAddOnDependencies('A1')).resolves.toEqual({
        packages_using: packages,
      })
    })
  })
})
