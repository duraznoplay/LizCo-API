import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { SafeUser } from '../users/users.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  login(user: SafeUser): { accessToken: string; user: SafeUser } {
    const payload = { sub: user.id, email: user.email, role: user.role }

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_ADMIN_SECRET'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expiresIn: (this.config.get<string>('JWT_ADMIN_EXPIRES_IN') ?? '8h') as any,
      issuer: 'lizco-backoffice',
      audience: 'lizco-admin',
    })

    return { accessToken, user }
  }
}
