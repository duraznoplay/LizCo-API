import { Module } from '@nestjs/common'

import { MediaController } from './media.controller'
import { MediaService } from './media.service'
import { mediaS3ClientProvider } from './providers/s3-client.provider'

@Module({
  controllers: [MediaController],
  providers: [MediaService, mediaS3ClientProvider],
})
export class MediaModule {}
