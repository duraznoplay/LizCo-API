import { Module } from '@nestjs/common'
import { RolesGuard } from '../../common/guards/roles.guard'
import { AdminController } from './admin.controller'
import { MediaAdminModule } from './media/media-admin.module'

@Module({
  imports: [MediaAdminModule],
  controllers: [AdminController],
  providers: [RolesGuard],
})
export class AdminModule {}
