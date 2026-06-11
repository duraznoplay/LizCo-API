import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common'

import { CatalogRepository } from './catalog.repository'
import type { CreateAddOnDto } from './dto/create-addon.dto'
import type { UpdateAddOnDto } from './dto/update-addon.dto'

@Injectable()
export class CatalogService {
  constructor(private readonly repo: CatalogRepository) {}

  async destinations() {
    try {
      return { items: await this.repo.listDestinations() }
    } catch {
      throw new ServiceUnavailableException('catalog_unavailable')
    }
  }

  async packages() {
    try {
      return { items: await this.repo.listPackages() }
    } catch {
      throw new ServiceUnavailableException('catalog_unavailable')
    }
  }

  async packageAddOns(packageSlug: string) {
    try {
      return { packageSlug, items: await this.repo.listAddOnsForPackageSlug(packageSlug) }
    } catch {
      throw new ServiceUnavailableException('catalog_unavailable')
    }
  }

  async allAddOns() {
    try {
      return { items: await this.repo.listAllAddOns() }
    } catch {
      throw new ServiceUnavailableException('catalog_unavailable')
    }
  }

  async blogs() {
    try {
      return { items: await this.repo.listBlogs() }
    } catch {
      throw new ServiceUnavailableException('catalog_unavailable')
    }
  }

  async blog(slug: string) {
    try {
      const row = await this.repo.blogBySlug(slug)
      if (!row) throw new NotFoundException('blog_not_found')
      return row
    } catch (e) {
      if (e instanceof NotFoundException) throw e
      throw new ServiceUnavailableException('catalog_unavailable')
    }
  }

  async listAddOnsForPackageSlug(packageSlug: string) {
    return this.repo.listAddOnsForPackageSlug(packageSlug)
  }

  async createAddOn(dto: CreateAddOnDto) {
    try {
      return await this.repo.createAddOn({
        id: dto.id,
        name: dto.name,
        type: dto.type,
        price: Number(dto.price),
        is_active: dto.is_active ?? true,
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : ''
      if (msg.includes('duplicate') || msg.includes('Unique violation')) {
        throw new ConflictException('ADD_ON_ALREADY_EXISTS')
      }
      throw new ServiceUnavailableException('catalog_unavailable')
    }
  }

  async updateAddOn(id: string, dto: UpdateAddOnDto) {
    try {
      const payload: Record<string, any> = {}
      if (dto.name !== undefined) payload.name = dto.name
      if (dto.type !== undefined) payload.type = dto.type
      if (dto.price !== undefined) payload.price = Number(dto.price)
      if (dto.is_active !== undefined) payload.is_active = dto.is_active

      return await this.repo.updateAddOn(id, payload)
    } catch (error) {
      throw new ServiceUnavailableException('catalog_unavailable')
    }
  }

  async deleteAddOn(id: string) {
    try {
      const packages = await this.repo.getAddOnDependencies(id)
      if (packages.length > 0) {
        throw new ConflictException({
          code: 'ADD_ON_IN_USE',
          message: 'Cannot delete add-on that is associated with packages',
          packages_using: packages,
        })
      }
      await this.repo.deleteAddOn(id)
      return { success: true, deleted_id: id }
    } catch (error) {
      if (error instanceof ConflictException) throw error
      throw new ServiceUnavailableException('catalog_unavailable')
    }
  }

  async getAddOnDependencies(id: string) {
    try {
      const packages = await this.repo.getAddOnDependencies(id)
      return { packages_using: packages }
    } catch {
      throw new ServiceUnavailableException('catalog_unavailable')
    }
  }
}
