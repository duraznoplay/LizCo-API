import { Test, TestingModule } from '@nestjs/testing'
import { SupabaseAdminService } from '../../supabase/supabase-admin.service'
import { AdminUser, UsersService } from './users.service'

const mockUser: AdminUser = {
  id: 'uuid-1',
  email: 'admin@global.tours',
  password: 'hashed',
  role: 'ADMIN',
  created_at: '2026-01-01T00:00:00Z',
}

const makeSupaMock = (data: AdminUser | null, error: object | null = null) => ({
  client: {
    schema: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data, error }),
          }),
        }),
      }),
    }),
  },
})

describe('UsersService', () => {
  let service: UsersService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: SupabaseAdminService, useValue: makeSupaMock(mockUser) },
      ],
    }).compile()
    service = module.get<UsersService>(UsersService)
  })

  it('returns AdminUser when found', async () => {
    const result = await service.findByEmail('admin@global.tours')
    expect(result).toEqual(mockUser)
  })

  it('returns null when Supabase returns error', async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: SupabaseAdminService, useValue: makeSupaMock(null, { message: 'not found' }) },
      ],
    }).compile()
    const svc = module.get<UsersService>(UsersService)
    expect(await svc.findByEmail('unknown@test.com')).toBeNull()
  })

  it('toSafeUser strips password field', () => {
    const safe = service.toSafeUser(mockUser)
    expect(safe).not.toHaveProperty('password')
    expect(safe.email).toBe(mockUser.email)
    expect(safe.role).toBe(mockUser.role)
  })
})
