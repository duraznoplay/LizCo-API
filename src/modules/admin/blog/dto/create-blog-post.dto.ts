import { Transform } from 'class-transformer'
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator'

export class CreateBlogPostDto {
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  title!: string

  @IsString()
  @MinLength(50, { message: 'content must be at least 50 characters' })
  content!: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase alphanumeric with hyphens only' })
  slug?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string
}
