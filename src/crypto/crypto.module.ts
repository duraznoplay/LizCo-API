import { Global, Module } from '@nestjs/common'
import { KeyRingService } from './key-ring.service'
import { RequestTokenService } from './request-token.service'

@Global()
@Module({
  providers: [KeyRingService, RequestTokenService],
  exports: [KeyRingService, RequestTokenService],
})
export class CryptoModule {}
