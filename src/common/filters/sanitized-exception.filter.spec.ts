import { BadRequestException, HttpException } from '@nestjs/common'
import { SanitizedExceptionFilter } from './sanitized-exception.filter'

function mockHost() {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }
  const req = { originalUrl: '/v1/x', method: 'POST' }
  return {
    host: {
      switchToHttp: () => ({ getResponse: () => res, getRequest: () => req }),
    } as never,
    res,
  }
}

describe('SanitizedExceptionFilter', () => {
  const filter = new SanitizedExceptionFilter()

  it('maps validation errors with safe code', () => {
    const { host, res } = mockHost()
    filter.catch(new BadRequestException('validation_failed'), host)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'validation_failed' })
  })

  it('does not leak raw DB error messages', () => {
    const { host, res } = mockHost()
    filter.catch(new HttpException({ message: 'relation "enterprise_tours.packages" does not exist' }, 500), host)
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'internal_error' })
  })

  it('maps 429 to rate_limited', () => {
    const { host, res } = mockHost()
    filter.catch(new HttpException('ThrottlerException', 429), host)
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'rate_limited' })
  })

  it('passes through bubbled validation fields', () => {
    const { host, res } = mockHost()
    filter.catch(
      new BadRequestException({ message: 'validation_failed', fields: { email: ['Enter a valid email'] } }),
      host,
    )
    expect(res.json).toHaveBeenCalledWith({
      ok: false,
      error: 'validation_failed',
      fields: { email: ['Enter a valid email'] },
    })
  })
})
