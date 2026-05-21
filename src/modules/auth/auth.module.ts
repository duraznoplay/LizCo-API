import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { JwtAdminGuard } from '../../common/guards/jwt-admin.guard'
import { UsersModule } from '../users/users.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtAdminStrategy } from './strategies/jwt-admin.strategy'
import { LocalStrategy } from './strategies/local.strategy'

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtAdminStrategy, JwtAdminGuard],
  exports: [JwtAdminStrategy, JwtAdminGuard],
})
export class BackofficeAuthModule {}
