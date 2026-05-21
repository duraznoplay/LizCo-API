import { UnauthorizedException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as bcrypt from 'bcrypt'
import { AdminUser, UsersService } from '../../users/users.service'
import { LocalStrategy } from './local.strategy'

const makeHash = (pwd: string) => bcrypt.hashSync(pwd, 10)

const mockUser: AdminUser = {
  id: 'uuid-1',
  email: 'admin@global.tours',
  password: makeHash('correctpassword'),
  role: 'ADMIN',
  created_at: '2026-01-01T00:00:00Z',
}

describe('LocalStrategy', () => {
  let strategy: LocalStrategy
  let findByEmail: jest.Mock

  beforeEach(async () => {
    findByEmail = jest.fn()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        {
          provide: UsersService,
          useValue: {
            findByEmail,
            toSafeUser: (u: AdminUser) => { const { password: _, ...safe } = u; return safe },
          },
        },
      ],
    }).compile()
    strategy = module.get<LocalStrategy>(LocalStrategy)
  })

  it('returns SafeUser when credentials are valid', async () => {
    findByEmail.mockResolvedValue(mockUser)
    const result = await strategy.validate('admin@global.tours', 'correctpassword')
    expect(result.email).toBe(mockUser.email)
    expect(result).not.toHaveProperty('password')
  })

  it('throws UnauthorizedException when password is wrong', async () => {
    findByEmail.mockResolvedValue(mockUser)
    await expect(strategy.validate('admin@global.tours', 'wrongpassword'))
      .rejects.toThrow(UnauthorizedException)
  })

  it('throws UnauthorizedException when email is not found', async () => {
    findByEmail.mockResolvedValue(null)
    await expect(strategy.validate('unknown@test.com', 'anypassword'))
      .rejects.toThrow(UnauthorizedException)
  })

  it('throws the same error message for wrong password and unknown email (no user enumeration)', async () => {
    findByEmail.mockResolvedValue(null)
    let errorA: UnauthorizedException | null = null
    try { await strategy.validate('noexist@test.com', 'pw') } catch (e) { errorA = e as UnauthorizedException }

    findByEmail.mockResolvedValue(mockUser)
    let errorB: UnauthorizedException | null = null
    try { await strategy.validate('admin@global.tours', 'wrongpw') } catch (e) { errorB = e as UnauthorizedException }

    expect(errorA?.message).toBe(errorB?.message)
  })
})
