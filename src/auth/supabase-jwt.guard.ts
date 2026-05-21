import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import type { Request } from 'express'

@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  private readonly log = new Logger(SupabaseJwtGuard.name)
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>
  private readonly issuer: string

  constructor(private readonly config: ConfigService) {
    const jwksUrl = this.config.getOrThrow<string>('SUPABASE_JWKS_URL')
    const supabaseUrl = this.config.getOrThrow<string>('SUPABASE_URL')
    this.jwks = createRemoteJWKSet(new URL(jwksUrl))
    this.issuer = `${supabaseUrl.replace(/\/$/, '')}/auth/v1`
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { user?: unknown }>()
    const header = req.headers.authorization
    if (!header || typeof header !== 'string' || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('unauthorized')
    }
    try {
      const { payload } = await jwtVerify(header.slice(7), this.jwks, {
        issuer: this.issuer,
        audience: 'authenticated',
      })
      const claims = payload as JWTPayload & { role?: string; sub?: string }
      ;(req as Request & { user?: { id: string; role: string } }).user = {
        id: String(claims.sub ?? ''),
        role: claims.role ?? 'authenticated',
      }
      return true
    } catch (err) {
      this.log.warn({ msg: 'supabase_jwt_invalid', reason: err instanceof Error ? err.message : 'unknown' })
      throw new UnauthorizedException('unauthorized')
    }
  }
}
