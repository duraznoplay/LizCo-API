import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { JwtAdminGuard } from '../../../common/guards/jwt-admin.guard'
import { CreatePackageDto } from './dto/create-package.dto'
import { PackagesQueryDto } from './dto/packages-query.dto'
import { UpdatePackageDto } from './dto/update-package.dto'
import { PackagesAdminService } from './packages-admin.service'

@Controller('admin/packages')
@UseGuards(JwtAdminGuard)
export class PackagesAdminController {
  constructor(private readonly service: PackagesAdminService) {}

  @Get()
  findAll(@Query() query: PackagesQueryDto) {
    return this.service.findAll(query)
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id)
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreatePackageDto) {
    return this.service.create(dto)
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePackageDto) {
    return this.service.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.delete(id)
  }
}
