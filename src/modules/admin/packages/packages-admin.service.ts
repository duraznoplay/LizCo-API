import { Injectable, NotFoundException } from '@nestjs/common'
import { PackagesAdminRepository } from './packages-admin.repository'
import type { CreatePackageDto } from './dto/create-package.dto'
import type { UpdatePackageDto } from './dto/update-package.dto'
import type { PackagesQueryDto } from './dto/packages-query.dto'

@Injectable()
export class PackagesAdminService {
  constructor(private readonly repo: PackagesAdminRepository) {}

  findAll(query: PackagesQueryDto) {
    return this.repo.findAll(query)
  }

  async findById(id: string) {
    const pkg = await this.repo.findById(id)
    if (!pkg) throw new NotFoundException(`Package ${id} not found`)
    return pkg
  }

  create(dto: CreatePackageDto) {
    return this.repo.create(dto)
  }

  async update(id: string, dto: UpdatePackageDto) {
    await this.findById(id)
    const updated = await this.repo.update(id, dto)
    if (!updated) throw new NotFoundException(`Package ${id} not found`)
    return updated
  }

  async delete(id: string): Promise<void> {
    const pkg = await this.repo.findById(id)
    if (!pkg) throw new NotFoundException(`Package ${id} not found`)
    await this.repo.delete(id)
  }
}
