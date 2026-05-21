import { Body, Controller, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { ZodValidationPipe } from '../../common/pipes/zod.pipe'
import {
  assistantTourCatalogSchema,
  type AssistantTourCatalog,
  type AssistantTourCatalogResponseDto,
} from './dto/assistant.dto'
import { AssistantService } from './assistant.service'

@Controller('assistant')
export class AssistantController {
  constructor(private readonly svc: AssistantService) {}

  @Post('tour-catalog')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  tourCatalog(
    @Body(new ZodValidationPipe(assistantTourCatalogSchema)) body: AssistantTourCatalog,
  ): Promise<AssistantTourCatalogResponseDto> {
    return this.svc.tourCatalog(body)
  }
}
