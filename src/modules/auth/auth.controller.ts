import { Body, Controller, HttpCode, Post, Request, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Public } from '../../common/decorators/public.decorator'
import { JwtAdminGuard } from '../../common/guards/jwt-admin.guard'
import { SafeUser } from '../users/users.service'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * @Public() skips RequestTokenGuard (JWE).
   * The BFF cannot mint a JWE before it has the admin JWT — this is the bootstrap endpoint.
   * ThrottlerGuard still applies (rate limiting).
   */
  @Public()
  @Post('login')
  @HttpCode(200)
  @UseGuards(AuthGuard('local'))
  login(@Request() req: { user: SafeUser }, @Body() _dto: LoginDto) {
    const result = this.authService.login(req.user)
    return { ok: true, ...result }
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAdminGuard)
  logout() {
    // JWT is stateless — BFF clears the cookie. Future: add jti to Redis blacklist.
    return { ok: true }
  }
}
