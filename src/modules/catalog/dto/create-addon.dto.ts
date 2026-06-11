import { Transform, Type } from 'class-transformer'
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator'

export enum AddOnPricingType {
  PER_BOOKING = 'PER_BOOKING',
  PER_PERSON = 'PER_PERSON',
  PER_DAY = 'PER_DAY',
}

export class CreateAddOnDto {
  @Transform(({ value }: { value: string }) => value?.trim().toUpperCase())
  @IsString()
  @Matches(/^[A-Z0-9]{1,10}$/, {
    message: 'id must be 1-10 uppercase alphanumeric characters',
  })
  id!: string

  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'name must not exceed 100 characters' })
  name!: string

  @IsEnum(AddOnPricingType, {
    message: 'type must be one of: PER_BOOKING, PER_PERSON, PER_DAY',
  })
  type!: AddOnPricingType

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'price must be a number with max 2 decimal places' })
  @Min(0, { message: 'price must be >= 0' })
  price!: number

  @IsOptional()
  @IsBoolean()
  is_active?: boolean = true
}
