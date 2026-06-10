import { SetMetadata } from '@nestjs/common'

export const SKIP_REQUEST_TOKEN_KEY = 'skipRequestToken'

export const SkipRequestToken = (): MethodDecorator & ClassDecorator =>
  SetMetadata(SKIP_REQUEST_TOKEN_KEY, true)
