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
import { RolesGuard } from '../../../common/guards/roles.guard'
import { Roles } from '../../../common/decorators/roles.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { BlogAdminService } from './blog-admin.service'
import { BlogQueryDto } from './dto/blog-query.dto'
import { CreateBlogPostDto } from './dto/create-blog-post.dto'
import { UpdateBlogPostDto } from './dto/update-blog-post.dto'

@Controller('admin/blogs')
@UseGuards(JwtAdminGuard, RolesGuard)
export class BlogAdminController {
  constructor(private readonly service: BlogAdminService) {}

  @Get('stats')
  @Roles('ADMIN', 'STAFF')
  async stats() {
    const counts = await this.service.getStats()
    return {
      total: counts.draft + counts.published + counts.archived,
      draft: counts.draft,
      published: counts.published,
      archived: counts.archived,
    }
  }

  @Get()
  @Roles('ADMIN', 'STAFF')
  findAll(@Query() q: BlogQueryDto) {
    return this.service.findAll(q)
  }

  @Get(':id')
  @Roles('ADMIN', 'STAFF')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id)
  }

  @Post()
  @HttpCode(201)
  @Roles('ADMIN')
  create(@Body() dto: CreateBlogPostDto, @CurrentUser() user: { id: string }) {
    return this.service.create(dto, user?.id)
  }

  // Specific literal sub-routes must come before :id/* wildcard routes
  @Post('bulk/publish')
  @Roles('ADMIN')
  async bulkPublish(@Body() body: { ids: string[] }) {
    return this.service.bulkPublish(body.ids)
  }

  @Post('bulk/archive')
  @Roles('ADMIN')
  async bulkArchive(@Body() body: { ids: string[] }) {
    return this.service.bulkArchive(body.ids)
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBlogPostDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.update(id, dto, user?.id)
  }

  @Post(':id/publish')
  @Roles('ADMIN')
  async publish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: { id: string }) {
    return this.service.publish(id, user?.id)
  }

  @Post(':id/archive')
  @Roles('ADMIN')
  async archive(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: { id: string }) {
    return this.service.archive(id, user?.id)
  }

  @Post(':id/restore')
  @Roles('ADMIN')
  async restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.restore(id)
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles('ADMIN')
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.delete(id)
  }
}
