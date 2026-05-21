import { Module } from '@nestjs/common'
import { CaptchaService } from './integrations/captcha.service'
import { ContactController } from './contact.controller'
import { ContactService } from './contact.service'

@Module({
  controllers: [ContactController],
  providers: [ContactService, CaptchaService],
})
export class ContactModule {}
