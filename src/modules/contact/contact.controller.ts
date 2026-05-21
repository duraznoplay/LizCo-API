import { Body, Controller, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { ZodValidationPipe } from '../../common/pipes/zod.pipe'
import {
  contactFormSchema,
  newsletterFormSchema,
  type ContactForm,
  type ContactSubmitResponseDto,
  type NewsletterForm,
  type NewsletterSubscribeResponseDto,
} from './dto/contact.dto'
import { ContactService } from './contact.service'

@Controller()
export class ContactController {
  constructor(private readonly svc: ContactService) {}

  @Post('contact')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  contact(@Body(new ZodValidationPipe(contactFormSchema)) body: ContactForm): Promise<ContactSubmitResponseDto> {
    return this.svc.submitContact(body)
  }

  @Post('newsletter')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  newsletter(
    @Body(new ZodValidationPipe(newsletterFormSchema)) body: NewsletterForm,
  ): Promise<NewsletterSubscribeResponseDto> {
    return this.svc.subscribeNewsletter(body)
  }
}
