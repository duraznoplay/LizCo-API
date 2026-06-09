import { Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import * as bcrypt from 'bcrypt'
import { randomBytes } from 'node:crypto'
import { Strategy } from 'passport-local'
import { UsersService } from '../../users/users.service'

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) implements OnModuleInit {
  private timingDummyHash!: string

  constructor(private readonly users: UsersService) {
    super({ usernameField: 'email' })
  }

  async onModuleInit(): Promise<void> {
    this.timingDummyHash = await bcrypt.hash(
      'lizco-timing-' + randomBytes(16).toString('hex'),
      12,
    )
  }

  async validate(email: string, password: string) {
    const user = await this.users.findByEmail(email)

    const hashToCheck = user?.password ?? this.timingDummyHash
    const isValid = await bcrypt.compare(password, hashToCheck)

    if (!user || !isValid) {
      throw new UnauthorizedException('invalid_credentials')
    }

    return this.users.toSafeUser(user)
  }
}
