import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'
import { SKIP_REQUEST_TOKEN_KEY } from '../decorators/skip-request-token.decorator'
import { RequestTokenService, type RequestTokenClaims } from '../../crypto/request-token.service'

type ReqWithRaw = Request & { rawBody?: Buffer; requestToken?: RequestTokenClaims }

@Injectable()
export class RequestTokenGuard implements CanActivate {
  private readonly log = new Logger(RequestTokenGuard.name)

  constructor(
    private readonly reflector: Reflector,
    private readonly tokenSvc: RequestTokenService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])
    if (isPublic) return true

    const skipRequestToken = this.reflector.getAllAndOverride<boolean>(SKIP_REQUEST_TOKEN_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])
    if (skipRequestToken) return true

    const req = ctx.switchToHttp().getRequest<ReqWithRaw>()
    const tokenHeader = req.headers['x-lizco-request-token']
    const token = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader

    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('invalid_request_token')
    }

    const pathOnly = (req.originalUrl ?? req.url ?? '/').split('?')[0]
    const methodUpper = req.method.toUpperCase()
    const rawBody: Buffer =
      methodUpper === 'GET' || methodUpper === 'HEAD'
        ? Buffer.alloc(0)
        : req.rawBody instanceof Buffer
          ? req.rawBody
          : Buffer.from(
              req.body === undefined || req.body === null
                ? ''
                : typeof req.body === 'string'
                  ? req.body
                  : JSON.stringify(req.body),
            )

    try {
      req.requestToken = await this.tokenSvc.verify({
        token,
        method: req.method,
        path: pathOnly,
        rawBody,
      })
      return true
    } catch (err) {
      this.log.warn({
        msg: 'request_token_rejected',
        reason: err instanceof Error ? err.message : 'unknown',
        path: pathOnly,
        method: req.method,
      })
      throw new UnauthorizedException('invalid_request_token')
    }
  }
}
