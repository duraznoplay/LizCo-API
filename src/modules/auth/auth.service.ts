import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import type { StringValue } from 'ms'
import { SafeUser } from '../users/users.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  login(user: SafeUser): { accessToken: string; user: SafeUser } {
    const payload = { sub: user.id, email: user.email, role: user.role }

    // JWT_ADMIN_EXPIRES_IN is validated as a non-empty string in env.schema.ts;
    // cast to StringValue (ms branded type) since the schema guarantees a valid duration.
    const expiresIn = (this.config.get<string>('JWT_ADMIN_EXPIRES_IN') ?? '8h') as StringValue

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_ADMIN_SECRET'),
      expiresIn,
      issuer: 'lizco-backoffice',
      audience: 'lizco-admin',
    })

    return { accessToken, user }
  }
}
