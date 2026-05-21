import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const ENTERPRISE_TOURS_SCHEMA = 'enterprise_tours'
export const POSTGREST_PUBLIC_SCHEMA = 'public'

@Injectable()
export class SupabaseAdminService implements OnModuleInit {
  private readonly log = new Logger(SupabaseAdminService.name)
  private _client: SupabaseClient | null = null

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.getOrThrow<string>('SUPABASE_URL').trim()
    const key = this.config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY').trim()
    if (!url || !key) {
      this.log.error('supabase admin client: missing URL or service role key')
      return
    }
    this._client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: ENTERPRISE_TOURS_SCHEMA },
    }) as unknown as SupabaseClient
    this.log.log('supabase admin client initialized (schema=enterprise_tours)')
  }

  get client(): SupabaseClient {
    if (!this._client) throw new Error('service_unconfigured')
    return this._client
  }
}
