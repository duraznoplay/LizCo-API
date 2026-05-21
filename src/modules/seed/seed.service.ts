import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import {
  ENTERPRISE_TOURS_SCHEMA,
  SupabaseAdminService,
} from '../../supabase/supabase-admin.service'

const BCRYPT_ROUNDS = 12

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name)

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseAdminService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedAdminUser()
  }

  private async seedAdminUser(): Promise<void> {
    const email = this.config.get<string>('ADMIN_EMAIL')
    const rawPassword = this.config.get<string>('ADMIN_PASSWORD')

    if (!email || !rawPassword) {
      this.logger.warn('[SeedService] ADMIN_EMAIL or ADMIN_PASSWORD not set. Skipping seed.')
      return
    }

    const { count, error: countError } = await this.supabase.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('users')
      .select('id', { count: 'exact', head: true })

    if (countError) {
      this.logger.error('[SeedService] Error checking users table:', countError.message)
      return
    }

    if ((count ?? 0) > 0) {
      this.logger.log('[SeedService] Admin already exists, skipping seed.')
      return
    }

    const passwordHash = await bcrypt.hash(rawPassword, BCRYPT_ROUNDS)

    const { error: insertError } = await this.supabase.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('users')
      .insert({ email, password: passwordHash, role: 'ADMIN' })

    if (insertError) {
      this.logger.error('[SeedService] Error creating admin user:', insertError.message)
      return
    }

    this.logger.log(`[SeedService] Admin user created: ${email}`)
  }
}
