import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

export interface JwtAdminPayload {
  sub: string
  email: string
  role: string
  iat: number
  exp: number
}

@Injectable()
export class JwtAdminStrategy extends PassportStrategy(Strategy, 'jwt-admin') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ADMIN_SECRET'),
      issuer: 'lizco-backoffice',
      audience: 'lizco-admin',
    })
  }

  async validate(payload: JwtAdminPayload) {
    if (!payload.sub || !payload.email || !payload.role) {
      throw new UnauthorizedException('invalid_token_payload')
    }
    return { id: payload.sub, email: payload.email, role: payload.role }
  }
}
