import { Module } from '@nestjs/common'
import { BackofficeAuthModule } from '../../auth/auth.module'
import { BlogAdminController } from './blog-admin.controller'
import { BlogAdminRepository } from './blog-admin.repository'
import { BlogAdminService } from './blog-admin.service'

@Module({
  imports: [BackofficeAuthModule],
  controllers: [BlogAdminController],
  providers: [BlogAdminService, BlogAdminRepository],
})
export class BlogAdminModule {}
