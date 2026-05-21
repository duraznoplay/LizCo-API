import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export type RequestUser = {
  id: string
  role: string
  email?: string
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): RequestUser | null => {
    const req = ctx.switchToHttp().getRequest<{ user?: RequestUser }>()
    return req.user ?? null
  },
)
