import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import * as bcrypt from 'bcrypt'
import { SupabaseAdminService } from '../../supabase/supabase-admin.service'
import { SeedService } from './seed.service'

const makeSupaMock = (count: number | null, countError: object | null = null, insertError: object | null = null) => ({
  client: {
    schema: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ count, error: countError }),
        insert: jest.fn().mockResolvedValue({ error: insertError }),
      }),
    }),
  },
})

describe('SeedService', () => {
  let service: SeedService
  let configGet: jest.Mock
  let supaMock: ReturnType<typeof makeSupaMock>

  beforeEach(async () => {
    configGet = jest.fn()
    supaMock = makeSupaMock(0)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedService,
        { provide: ConfigService, useValue: { get: configGet } },
        { provide: SupabaseAdminService, useValue: supaMock },
      ],
    }).compile()

    service = module.get<SeedService>(SeedService)
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined)
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => jest.clearAllMocks())

  it('skips seed when ADMIN_EMAIL is not set', async () => {
    configGet.mockReturnValue(undefined)

    await service.onApplicationBootstrap()

    expect(supaMock.client.schema).not.toHaveBeenCalled()
  })

  it('skips seed when ADMIN_PASSWORD is not set', async () => {
    configGet.mockImplementation((key: string) => key === 'ADMIN_EMAIL' ? 'admin@test.com' : undefined)

    await service.onApplicationBootstrap()

    expect(supaMock.client.schema).not.toHaveBeenCalled()
  })

  it('skips insert when users table is not empty', async () => {
    configGet.mockImplementation((key: string) =>
      key === 'ADMIN_EMAIL' ? 'admin@test.com' : 'supersecretpassword',
    )
    supaMock = makeSupaMock(1)
    // rebuild service with updated mock
    const module = await Test.createTestingModule({
      providers: [
        SeedService,
        { provide: ConfigService, useValue: { get: configGet } },
        { provide: SupabaseAdminService, useValue: supaMock },
      ],
    }).compile()
    const svc = module.get<SeedService>(SeedService)

    await svc.onApplicationBootstrap()

    const fromMock = supaMock.client.schema('').from('')
    expect(fromMock.insert).not.toHaveBeenCalled()
  })

  it('creates admin with bcrypt hash when table is empty', async () => {
    const rawPassword = 'supersecretpassword'
    configGet.mockImplementation((key: string) =>
      key === 'ADMIN_EMAIL' ? 'admin@test.com' : rawPassword,
    )

    await service.onApplicationBootstrap()

    const fromMock = supaMock.client.schema('').from('')
    expect(fromMock.insert).toHaveBeenCalledTimes(1)

    const insertArg = (fromMock.insert as jest.Mock).mock.calls[0][0]
    expect(insertArg.email).toBe('admin@test.com')
    expect(insertArg.role).toBe('ADMIN')
    expect(insertArg.password).not.toBe(rawPassword)
    expect(await bcrypt.compare(rawPassword, insertArg.password)).toBe(true)
  })

  it('logs error and does not throw when Supabase insert fails', async () => {
    configGet.mockImplementation((key: string) =>
      key === 'ADMIN_EMAIL' ? 'admin@test.com' : 'supersecretpassword',
    )
    supaMock = makeSupaMock(0, null, { message: 'insert failed' })
    const module = await Test.createTestingModule({
      providers: [
        SeedService,
        { provide: ConfigService, useValue: { get: configGet } },
        { provide: SupabaseAdminService, useValue: supaMock },
      ],
    }).compile()
    const svc = module.get<SeedService>(SeedService)

    await expect(svc.onApplicationBootstrap()).resolves.not.toThrow()
  })
})
