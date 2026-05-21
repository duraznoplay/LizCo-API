import { Test, TestingModule } from '@nestjs/testing'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { SafeUser } from '../users/users.service'

const mockUser: SafeUser = {
  id: 'uuid-1',
  email: 'admin@global.tours',
  role: 'ADMIN',
  created_at: '2026-01-01T00:00:00Z',
}

describe('AuthController', () => {
  let controller: AuthController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn().mockReturnValue({ accessToken: 'token123', user: mockUser }),
          },
        },
      ],
    }).compile()
    controller = module.get<AuthController>(AuthController)
  })

  it('login returns ok + accessToken + user', () => {
    const result = controller.login({ user: mockUser }, {} as any)
    expect(result.ok).toBe(true)
    expect(result.accessToken).toBe('token123')
    expect(result.user).toEqual(mockUser)
  })

  it('logout returns { ok: true }', () => {
    expect(controller.logout()).toEqual({ ok: true })
  })
})
