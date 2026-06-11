import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'

import { CatalogService } from './catalog.service'
import { CreateAddOnDto } from './dto/create-addon.dto'
import { UpdateAddOnDto } from './dto/update-addon.dto'

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('destinations')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  destinations() {
    return this.catalog.destinations()
  }

  @Get('packages')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  packages() {
    return this.catalog.packages()
  }

  @Get('packages/:slug/add-ons')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  packageAddOns(@Param('slug') slug: string) {
    return this.catalog.packageAddOns(slug)
  }

  @Get('add-ons')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  addOns() {
    return this.catalog.allAddOns()
  }

  @Get('blogs')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  blogs() {
    return this.catalog.blogs()
  }

  @Get('blogs/:slug')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  blog(@Param('slug') slug: string) {
    return this.catalog.blog(slug)
  }

  @Post('add-ons')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  createAddOn(@Body() dto: CreateAddOnDto) {
    return this.catalog.createAddOn(dto)
  }

  @Patch('add-ons/:id')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  updateAddOn(@Param('id') id: string, @Body() dto: UpdateAddOnDto) {
    return this.catalog.updateAddOn(id, dto)
  }

  @Delete('add-ons/:id')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  deleteAddOn(@Param('id') id: string) {
    return this.catalog.deleteAddOn(id)
  }

  @Get('add-ons/:id/packages')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  addOnDependencies(@Param('id') id: string) {
    return this.catalog.getAddOnDependencies(id)
  }
}
