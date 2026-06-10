import { Transform, Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'

export class CreatePackageDto {
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string

  @IsOptional()
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  slug?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string

  @IsNumber()
  @Min(0)
  base_price!: number

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  duration_days!: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  duration_nights?: number

  @IsOptional()
  @IsBoolean()
  is_active?: boolean

  @IsOptional()
  @IsUUID()
  destination_id?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[]

  @IsOptional()
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'image must be a valid http or https URL' },
  )
  @MaxLength(500)
  image?: string
}
