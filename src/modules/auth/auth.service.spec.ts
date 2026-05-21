import { JwtService } from '@nestjs/jwt'
import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import * as jwt from 'jsonwebtoken'
import { AuthService } from './auth.service'
import { SafeUser } from '../users/users.service'

const mockUser: SafeUser = {
  id: 'uuid-1',
  email: 'admin@global.tours',
  role: 'ADMIN',
  created_at: '2026-01-01T00:00:00Z',
}

const SECRET = 'testsecretminimum32characterslongok'

describe('AuthService', () => {
  let service: AuthService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: new JwtService({}) },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue(SECRET),
            get: jest.fn().mockReturnValue('8h'),
          },
        },
      ],
    }).compile()
    service = module.get<AuthService>(AuthService)
  })

  it('returns accessToken and user without password', () => {
    const result = service.login(mockUser)
    expect(result.user).toEqual(mockUser)
    expect(result.accessToken).toBeTruthy()
    expect(result.user).not.toHaveProperty('password')
  })

  it('generated JWT is verifiable with the same secret', () => {
    const { accessToken } = service.login(mockUser)
    const decoded = jwt.verify(accessToken, SECRET, {
      issuer: 'lizco-backoffice',
      audience: 'lizco-admin',
    }) as jwt.JwtPayload
    expect(decoded.sub).toBe(mockUser.id)
    expect(decoded.email).toBe(mockUser.email)
    expect(decoded.role).toBe(mockUser.role)
  })
})
