import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { ZodValidationPipe } from '../../common/pipes/zod.pipe'
import { BookingService } from './booking.service'
import {
  bookingSubmitSchema,
  quoteQuerySchema,
  type BookingQuoteRequestDto,
  type BookingQuoteResponseDto,
  type BookingSubmitRequestDto,
  type BookingSubmitResponseDto,
} from './dto/booking.dto'

@Controller('booking')
export class BookingController {
  constructor(private readonly svc: BookingService) {}

  @Get('quote')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  quote(
    @Query(new ZodValidationPipe(quoteQuerySchema)) q: BookingQuoteRequestDto,
  ): Promise<BookingQuoteResponseDto> {
    return this.svc.quote(q)
  }

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  submit(
    @Body(new ZodValidationPipe(bookingSubmitSchema)) body: BookingSubmitRequestDto,
  ): Promise<BookingSubmitResponseDto> {
    return this.svc.submit(body)
  }
}
