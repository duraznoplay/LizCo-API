import { Controller, Get } from '@nestjs/common'

@Controller('admin/packages/debug')
export class PackagesDebugController {
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() }
  }
}
