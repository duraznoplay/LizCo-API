import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query, UseGuards, UseInterceptors, UploadedFile, BadGatewayException } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAdminGuard } from '../../../common/guards/jwt-admin.guard'
import { RolesGuard } from '../../../common/guards/roles.guard'
import { Roles } from '../../../common/decorators/roles.decorator'
import { SkipRequestToken } from '../../../common/decorators/skip-request-token.decorator'
import { ZodValidationPipe } from '../../../common/pipes/zod.pipe'
import { MediaService } from '../../media/media.service'
import type { CreateMediaDto, MediaDetailDto, MediaListAdminDto, PresignedUrlRequestDto, UpdateMediaDto } from '../../media/dto/media-admin.dto'
import { createMediaSchema, presignedUrlSchema, updateMediaSchema } from '../../media/dto/media-admin.dto'

@Controller('admin/media')
@UseGuards(JwtAdminGuard, RolesGuard)
@Roles('ADMIN', 'STAFF')
export class MediaAdminController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('s3')
  async listFromS3(
    @Query('section') section?: string,
    @Query('slug') slug?: string,
    @Query('variant') variant?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const { items, total } = await this.mediaService.listMediaFromS3({
      section,
      slug,
      variant,
      limit: limit ? parseInt(limit, 10) : 10,
      offset: offset ? parseInt(offset, 10) : 0,
    })
    return { items, total }
  }

  @Get()
  async list(
    @Query('section') section?: string,
    @Query('slug') slug?: string,
    @Query('variant') variant?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<MediaListAdminDto> {
    const { items, total } = await this.mediaService.listMetadata({
      section,
      slug,
      variant,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    })

    const domain = process.env.CLOUDFRONT_DOMAIN || ''
    const details: MediaDetailDto[] = items.map((item) => ({
      id: item.id,
      s3_key: item.s3_key,
      section: item.section,
      slug: item.slug || undefined,
      variant: item.variant || undefined,
      title: item.title || undefined,
      description: item.description || undefined,
      alt_text: item.alt_text || undefined,
      size_bytes: item.size_bytes || undefined,
      content_type: item.content_type || undefined,
      url: `https://${domain}/${encodeURI(item.s3_key)}`,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }))

    return {
      items: details,
      total,
    }
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<MediaDetailDto> {
    const metadata = await this.mediaService.getMetadata(id)
    if (!metadata) throw new NotFoundException('media_not_found')

    const domain = process.env.CLOUDFRONT_DOMAIN || ''
    return {
      id: metadata.id,
      s3_key: metadata.s3_key,
      section: metadata.section,
      slug: metadata.slug || undefined,
      variant: metadata.variant || undefined,
      title: metadata.title || undefined,
      description: metadata.description || undefined,
      alt_text: metadata.alt_text || undefined,
      size_bytes: metadata.size_bytes || undefined,
      content_type: metadata.content_type || undefined,
      url: `https://${domain}/${encodeURI(metadata.s3_key)}`,
      created_at: metadata.created_at,
      updated_at: metadata.updated_at,
    }
  }

  @Post('presigned-url')
  async generatePresignedUrl(
    @Body(new ZodValidationPipe(presignedUrlSchema)) body: PresignedUrlRequestDto,
  ) {
    return this.mediaService.generatePresignedUrl(body)
  }

  @Post('upload')
  @SkipRequestToken()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: any,
    @Body() body: { section: string; slug?: string; variant?: string },
  ) {
    if (!file) {
      throw new BadGatewayException('file_required')
    }

    const { key, size } = await this.mediaService.uploadFile(
      body.section,
      body.slug,
      body.variant,
      file.originalname,
      file.mimetype,
      file.buffer,
    )

    return { key, size }
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createMediaSchema)) _body: CreateMediaDto,
  ): Promise<MediaDetailDto> {
    // This endpoint is called AFTER the file is uploaded to S3 via presigned URL
    // The frontend will provide the S3 key (path where file was uploaded)
    // This just creates the metadata record
    throw new Error('Use POST /admin/media/presigned-url first, then PUT /admin/media/:id after upload')
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateMediaSchema.partial())) body: UpdateMediaDto,
  ): Promise<MediaDetailDto> {
    const metadata = await this.mediaService.updateMetadata(id, body)
    if (!metadata) throw new NotFoundException('media_not_found')

    const domain = process.env.CLOUDFRONT_DOMAIN || ''
    return {
      id: metadata.id,
      s3_key: metadata.s3_key,
      section: metadata.section,
      slug: metadata.slug || undefined,
      variant: metadata.variant || undefined,
      title: metadata.title || undefined,
      description: metadata.description || undefined,
      alt_text: metadata.alt_text || undefined,
      size_bytes: metadata.size_bytes || undefined,
      content_type: metadata.content_type || undefined,
      url: `https://${domain}/${encodeURI(metadata.s3_key)}`,
      created_at: metadata.created_at,
      updated_at: metadata.updated_at,
    }
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<{ success: true }> {
    const metadata = await this.mediaService.getMetadata(id)
    if (!metadata) throw new NotFoundException('media_not_found')

    await this.mediaService.deleteById(id)
    return { success: true }
  }

  @Post('register-upload')
  async registerUpload(
    @Body() body: { s3_key: string } & CreateMediaDto,
  ): Promise<MediaDetailDto> {
    const metadata = await this.mediaService.createMetadata(
      body.s3_key,
      {
        section: body.section,
        slug: body.slug,
        variant: body.variant,
        title: body.title,
        description: body.description,
        alt_text: body.alt_text,
      },
    )

    const domain = process.env.CLOUDFRONT_DOMAIN || ''
    return {
      id: metadata.id,
      s3_key: metadata.s3_key,
      section: metadata.section,
      slug: metadata.slug || undefined,
      variant: metadata.variant || undefined,
      title: metadata.title || undefined,
      description: metadata.description || undefined,
      alt_text: metadata.alt_text || undefined,
      size_bytes: metadata.size_bytes || undefined,
      content_type: metadata.content_type || undefined,
      url: `https://${domain}/${encodeURI(metadata.s3_key)}`,
      created_at: metadata.created_at,
      updated_at: metadata.updated_at,
    }
  }
}
