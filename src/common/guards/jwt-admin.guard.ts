import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

/**
 * Verifies the Admin JWT issued by BackofficeAuthModule.
 * Uses the 'jwt-admin' Passport strategy (JwtAdminStrategy).
 *
 * Apply at controller level — NOT globally:
 *   @UseGuards(JwtAdminGuard)
 *   @Controller('admin/packages')
 *
 * Full guard chain for admin routes:
 *   RequestTokenGuard (global, JWE) → ThrottlerGuard (global) → JwtAdminGuard (controller)
 */
@Injectable()
export class JwtAdminGuard extends AuthGuard('jwt-admin') {}
