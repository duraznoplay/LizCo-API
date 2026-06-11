import { Transform, Type } from 'class-transformer'
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator'
import { AddOnPricingType } from './create-addon.dto'

export class UpdateAddOnDto {
  @IsOptional()
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @MaxLength(100, { message: 'name must not exceed 100 characters' })
  name?: string

  @IsOptional()
  @IsEnum(AddOnPricingType, {
    message: 'type must be one of: PER_BOOKING, PER_PERSON, PER_DAY',
  })
  type?: AddOnPricingType

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'price must be a number with max 2 decimal places' })
  @Min(0, { message: 'price must be >= 0' })
  price?: number

  @IsOptional()
  @IsBoolean()
  is_active?: boolean
}
