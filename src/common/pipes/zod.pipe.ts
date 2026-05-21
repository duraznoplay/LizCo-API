import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common'
import { ZodError, type ZodTypeAny } from 'zod'

@Injectable()
export class ZodValidationPipe<T extends ZodTypeAny> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown): unknown {
    try {
      return this.schema.parse(value)
    } catch (err) {
      if (err instanceof ZodError) {
        throw new BadRequestException({
          message: 'validation_failed',
          fields: err.flatten().fieldErrors,
        })
      }
      throw err
    }
  }
}
