import { Module } from '@nestjs/common'
import { RolesGuard } from '../../../common/guards/roles.guard'
import { BackofficeAuthModule } from '../../auth/auth.module'
import { BlogAdminController } from './blog-admin.controller'
import { BlogAdminRepository } from './blog-admin.repository'
import { BlogAdminService } from './blog-admin.service'

@Module({
  imports: [BackofficeAuthModule],
  controllers: [BlogAdminController],
  providers: [BlogAdminService, BlogAdminRepository, RolesGuard],
})
export class BlogAdminModule {}
