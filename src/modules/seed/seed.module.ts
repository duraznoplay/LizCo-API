import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../supabase/supabase.module'
import { SeedService } from './seed.service'

@Module({
  imports: [SupabaseModule],
  providers: [SeedService],
})
export class SeedModule {}
