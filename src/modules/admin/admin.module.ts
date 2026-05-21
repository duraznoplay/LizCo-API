import { Module } from '@nestjs/common'
import { RolesGuard } from '../../common/guards/roles.guard'
import { AdminController } from './admin.controller'

@Module({
  controllers: [AdminController],
  providers: [RolesGuard],
})
export class AdminModule {}
