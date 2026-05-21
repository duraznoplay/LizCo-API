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
import { BlogAdminService } from './blog-admin.service'
import { BlogQueryDto } from './dto/blog-query.dto'
import { CreateBlogPostDto } from './dto/create-blog-post.dto'
import { UpdateBlogPostDto } from './dto/update-blog-post.dto'

@Controller('admin/blogs')
@UseGuards(JwtAdminGuard)
export class BlogAdminController {
  constructor(private readonly service: BlogAdminService) {}

  @Get()
  findAll(@Query() q: BlogQueryDto) {
    return this.service.findAll(q)
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id)
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateBlogPostDto) {
    return this.service.create(dto)
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBlogPostDto) {
    return this.service.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.delete(id)
  }
}
