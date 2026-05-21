import { ForbiddenException, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'

@Injectable()
export class CaptchaService {
  private readonly log = new Logger(CaptchaService.name)

  constructor(private readonly config: ConfigService) {}

  async verify(token?: string): Promise<void> {
    const secret = (this.config.get<string>('HCAPTCHA_SECRET') ?? '').trim()
    if (!secret) {
      this.log.debug('captcha disabled (HCAPTCHA_SECRET not set)')
      return
    }
    if (!token) throw new ForbiddenException('captcha_failed')
    try {
      const res = await axios.post<{ success?: boolean; 'error-codes'?: string[] }>(
        'https://hcaptcha.com/siteverify',
        new URLSearchParams({ secret, response: token }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      )
      const json = res.data
      if (!json.success) {
        this.log.warn({ msg: 'captcha_rejected', codes: json['error-codes'] })
        throw new ForbiddenException('captcha_failed')
      }
    } catch (err) {
      if (err instanceof ForbiddenException) throw err
      this.log.error({ err }, 'captcha_verify_failed')
      throw new ForbiddenException('captcha_failed')
    }
  }
}
