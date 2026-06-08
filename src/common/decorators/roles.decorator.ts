import { SetMetadata } from '@nestjs/common'

export const ROLES_KEY = 'roles'

export type AppRole = 'ADMIN' | 'STAFF'

export const Roles = (...roles: AppRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles)
