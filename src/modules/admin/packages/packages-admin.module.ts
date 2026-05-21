import { Module } from '@nestjs/common'
import { BackofficeAuthModule } from '../../auth/auth.module'
import { PackagesAdminController } from './packages-admin.controller'
import { PackagesAdminRepository } from './packages-admin.repository'
import { PackagesAdminService } from './packages-admin.service'

@Module({
  imports: [BackofficeAuthModule],
  controllers: [PackagesAdminController],
  providers: [PackagesAdminService, PackagesAdminRepository],
})
export class PackagesAdminModule {}
