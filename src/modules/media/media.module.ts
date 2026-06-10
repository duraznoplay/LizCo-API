import { Module } from '@nestjs/common'

import { MediaController } from './media.controller'
import { MediaService } from './media.service'
import { mediaS3ClientProvider } from './providers/s3-client.provider'
import { MediaMetadataRepository } from './media-metadata.repository'

@Module({
  controllers: [MediaController],
  providers: [MediaService, mediaS3ClientProvider, MediaMetadataRepository],
  exports: [MediaService],
})
export class MediaModule {}
