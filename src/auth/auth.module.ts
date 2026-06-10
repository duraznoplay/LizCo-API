import { Global, Module } from '@nestjs/common'
import { SupabaseJwtGuard } from '../common/guards/supabase-jwt.guard'

@Global()
@Module({
  providers: [SupabaseJwtGuard],
  exports: [SupabaseJwtGuard],
})
export class SupabaseAuthModule {}
