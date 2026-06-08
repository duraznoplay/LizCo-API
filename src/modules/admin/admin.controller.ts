import { Controller, Get, UseGuards } from '@nestjs/common'
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'
import { JwtAdminGuard } from '../../common/guards/jwt-admin.guard'

@Controller('admin')
@UseGuards(JwtAdminGuard, RolesGuard)
export class AdminController {
  @Get('me')
  @Roles('ADMIN', 'STAFF')
  me(@CurrentUser() user: RequestUser | null) {
    return { ok: true, user }
  }
}
