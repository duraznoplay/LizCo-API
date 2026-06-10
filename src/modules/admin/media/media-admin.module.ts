import { Module } from '@nestjs/common'
import { MediaAdminController } from './media-admin.controller'
import { MediaModule } from '../../media/media.module'

@Module({
  imports: [MediaModule],
  controllers: [MediaAdminController],
})
export class MediaAdminModule {}
