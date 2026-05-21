import { Controller, Get, Query } from '@nestjs/common'

import { ZodValidationPipe } from '../../common/pipes/zod.pipe'
import type { MediaListQueryDto, MediaListResponseDto } from './dto/media-list-response.dto'
import { mediaListQuerySchema } from './dto/media-list-response.dto'
import { MediaService } from './media.service'

@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(mediaListQuerySchema)) query: MediaListQueryDto,
  ): Promise<MediaListResponseDto> {
    return this.media.listMedia(query)
  }
}
