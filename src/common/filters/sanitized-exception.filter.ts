import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common'
import type { Request, Response } from 'express'

const SAFE_CODES = new Set([
  'validation_failed',
  'invalid_request_token',
  'invalid_json',
  'method_not_allowed',
  'not_found',
  'forbidden',
  'rate_limited',
  'unauthorized',
  'package_not_found',
  'invalid_package_price',
  'pricing_unavailable',
  'customer_insert_failed',
  'booking_insert_failed',
  'add_ons_load_failed',
  'blog_not_found',
  'catalog_unavailable',
  'captcha_failed',
  'service_unconfigured',
])

@Injectable()
@Catch()
export class SanitizedExceptionFilter implements ExceptionFilter {
  private readonly log = new Logger('Exception')

  catch(exc: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp()
    const res = http.getResponse<Response>()
    const req = http.getRequest<Request>()

    let status = 500
    let code = 'internal_error'
    let fields: Record<string, string[]> | undefined

    if (exc instanceof HttpException) {
      status = exc.getStatus()
      const response = exc.getResponse()
      if (typeof response === 'string') {
        code = SAFE_CODES.has(response) ? response : mapStatusToCode(status)
      } else if (typeof response === 'object' && response !== null) {
        const r = response as {
          message?: string | string[]
          error?: string
          fields?: Record<string, string[]>
        }
        const candidates = [
          Array.isArray(r.message) ? r.message[0] : r.message,
          r.error,
        ].filter((v): v is string => typeof v === 'string')
        code = candidates.find((c) => SAFE_CODES.has(c)) ?? mapStatusToCode(status)
        if (r.fields) fields = r.fields
      } else {
        code = mapStatusToCode(status)
      }
    }

    if (status >= 500) {
      this.log.error(
        {
          msg: 'unhandled_exception',
          path: req.originalUrl,
          method: req.method,
          err: exc instanceof Error ? { name: exc.name, message: exc.message, stack: exc.stack } : String(exc),
        },
        'unhandled_exception',
      )
    }

    res.status(status).json({ ok: false, error: code, ...(fields ? { fields } : {}) })
  }
}

function mapStatusToCode(status: number): string {
  if (status === 400) return 'validation_failed'
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not_found'
  if (status === 405) return 'method_not_allowed'
  if (status === 429) return 'rate_limited'
  return 'internal_error'
}
