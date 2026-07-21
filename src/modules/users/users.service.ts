import { Injectable } from '@nestjs/common'
import {
  POSTGREST_PUBLIC_SCHEMA,
  SupabaseAdminService,
} from '../../supabase/supabase-admin.service'

export interface AdminUser {
  id: string
  email: string
  password: string
  role: string
  created_at: string
}

export type SafeUser = Omit<AdminUser, 'password'>

@Injectable()
export class UsersService {
  constructor(private readonly supabase: SupabaseAdminService) {}

  async findByEmail(email: string): Promise<AdminUser | null> {
    const { data, error } = await this.supabase.client
      .schema(POSTGREST_PUBLIC_SCHEMA)
      .from('users')
      .select('id, email, password, role, created_at')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (error || !data) return null
    return data as AdminUser
  }

  toSafeUser(user: AdminUser): SafeUser {
    const { password: _password, ...safe } = user
    return safe
  }
}
