import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common'

import { CatalogRepository } from './catalog.repository'

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
}
