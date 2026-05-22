import { Transform } from 'class-transformer'
import { IsArray, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator'

export class CreatePackageDto {
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string

  @IsString()
  @MinLength(10)
  description!: string

  @IsNumber()
  @Min(0)
  price!: number

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[]

  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string
}
