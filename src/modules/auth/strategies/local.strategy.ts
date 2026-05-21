import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import * as bcrypt from 'bcrypt'
import { Strategy } from 'passport-local'
import { UsersService } from '../../users/users.service'

// Dummy hash used to normalize timing when user is not found (prevent user enumeration via timing)
const TIMING_DUMMY_HASH = '$2b$12$invalidhashfortimingnormalizationpadding00000000000000000'

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly users: UsersService) {
    super({ usernameField: 'email' })
  }

  async validate(email: string, password: string) {
    const user = await this.users.findByEmail(email)

    const hashToCheck = user?.password ?? TIMING_DUMMY_HASH
    const isValid = await bcrypt.compare(password, hashToCheck)

    if (!user || !isValid) {
      throw new UnauthorizedException('invalid_credentials')
    }

    return this.users.toSafeUser(user)
  }
}
