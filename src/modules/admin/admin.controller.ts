import { Controller, Get, UseGuards } from '@nestjs/common'
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'
import { SupabaseJwtGuard } from '../../auth/supabase-jwt.guard'

@Controller('admin')
@UseGuards(SupabaseJwtGuard, RolesGuard)
export class AdminController {
  @Get('me')
  @Roles('admin', 'staff')
  me(@CurrentUser() user: RequestUser | null) {
    return { ok: true, user }
  }
}
