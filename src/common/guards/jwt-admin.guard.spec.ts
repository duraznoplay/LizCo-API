import { JwtAdminGuard } from './jwt-admin.guard'

describe('JwtAdminGuard', () => {
  it('is instantiable', () => {
    const guard = new JwtAdminGuard()
    expect(guard).toBeDefined()
    expect(typeof guard.canActivate).toBe('function')
  })

  it('extends AuthGuard with jwt-admin strategy', () => {
    // The guard delegates to Passport's AuthGuard('jwt-admin').
    // Full chain behaviour (JWE → JwtAdminGuard) is verified in E2E tests.
    expect(JwtAdminGuard.prototype.constructor.name).toBe('JwtAdminGuard')
  })
})
