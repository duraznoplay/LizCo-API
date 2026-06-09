import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { generateSlug } from '@/common/utils/slug.util'
import { PackagesAdminRepository } from './packages-admin.repository'
import type { CreatePackageDto } from './dto/create-package.dto'
import type { UpdatePackageDto } from './dto/update-package.dto'
import type { PackagesQueryDto } from './dto/packages-query.dto'
import type { PackageAdminRow, DestinationRow } from '@/types/db.types'

@Injectable()
export class PackagesAdminService {
  constructor(private readonly repo: PackagesAdminRepository) {}

  findAll(query: PackagesQueryDto) {
    return this.repo.findAll(query)
  }

  async findById(id: string): Promise<PackageAdminRow> {
    const pkg = await this.repo.findById(id)
    if (!pkg) throw new NotFoundException(`Package ${id} not found`)
    return pkg
  }

  async create(dto: CreatePackageDto): Promise<PackageAdminRow> {
    const rawSlug = dto.slug ?? generateSlug(dto.name)
    const slug = await this.resolveUniqueSlug(rawSlug)
    const payload: CreatePackageDto = {
      ...dto,
      slug,
      is_active: dto.is_active ?? true,
    }
    return this.repo.create(payload)
  }

  async update(id: string, dto: UpdatePackageDto): Promise<PackageAdminRow> {
    const existing = await this.findById(id)

    const payload: UpdatePackageDto = { ...dto }

    // Handle slug: explicit change, auto-change from name, or keep existing
    if (dto.slug && dto.slug !== existing.slug) {
      const exists = await this.repo.existsBySlug(dto.slug, id)
      if (exists) throw new ConflictException('slug_conflict')
      payload.slug = dto.slug
    } else if (dto.name && dto.name !== existing.name && !dto.slug) {
      const generated = generateSlug(dto.name)
      if (generated !== existing.slug) {
        payload.slug = await this.resolveUniqueSlug(generated, id)
      }
    }

    const updated = await this.repo.update(id, payload)
    if (!updated) throw new NotFoundException(`Package ${id} not found`)
    return updated
  }

  async delete(id: string): Promise<void> {
    const pkg = await this.findById(id)
    if (!pkg) throw new NotFoundException(`Package ${id} not found`)
    await this.repo.delete(id)
  }

  async findDestinations(): Promise<DestinationRow[]> {
    return this.repo.findDestinations()
  }

  private async resolveUniqueSlug(base: string, excludeId?: string): Promise<string> {
    let candidate = base
    let n = 2

    while (await this.repo.existsBySlug(candidate, excludeId)) {
      candidate = `${base}-${n}`
      n++
    }

    return candidate
  }
}
