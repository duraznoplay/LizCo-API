import { Test } from '@nestjs/testing'
import { CatalogRepository } from './catalog.repository'
import { CatalogService } from './catalog.service'

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
})
