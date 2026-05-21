import { Injectable, InternalServerErrorException } from '@nestjs/common'
import {
  ENTERPRISE_TOURS_SCHEMA,
  SupabaseAdminService,
} from '../../supabase/supabase-admin.service'
import { CaptchaService } from './integrations/captcha.service'
import type {
  ContactForm,
  ContactSubmitResponseDto,
  NewsletterForm,
  NewsletterSubscribeResponseDto,
} from './dto/contact.dto'

@Injectable()
export class ContactService {
  constructor(
    private readonly supa: SupabaseAdminService,
    private readonly captcha: CaptchaService,
  ) {}

  async submitContact(data: ContactForm): Promise<ContactSubmitResponseDto> {
    await this.captcha.verify(data.captchaToken)
    const row = {
      name: data.name,
      email: data.email,
      phone: data.phone?.trim() ? data.phone.trim() : null,
      subject: data.subject,
      message: data.message,
    }
    const { error } = await this.supa.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('contact_leads')
      .insert(row)
    if (error) throw new InternalServerErrorException('internal_error')
    return { ok: true as const }
  }

  async subscribeNewsletter(data: NewsletterForm): Promise<NewsletterSubscribeResponseDto> {
    await this.captcha.verify(data.captchaToken)
    const { error } = await this.supa.client
      .schema(ENTERPRISE_TOURS_SCHEMA)
      .from('newsletter_subscribers')
      .upsert({ email: data.email.toLowerCase() }, { onConflict: 'email' })
    if (error) throw new InternalServerErrorException('internal_error')
    return { ok: true as const }
  }
}
