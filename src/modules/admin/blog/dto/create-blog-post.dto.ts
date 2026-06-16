import { Transform } from 'class-transformer'
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator'
import { BlogStatus } from './blog-status.enum'

// Converts null → undefined so @IsOptional() skips validation for empty nullable fields.
const nullToUndef = () => Transform(({ value }) => (value === null ? undefined : value))

export class CreateBlogPostDto {
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title!: string

  @IsString()
  @MinLength(1)
  content!: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase alphanumeric with hyphens only' })
  slug?: string

  // Accepts absolute URLs (https://...) and relative paths (/images/...) for local assets.
  @nullToUndef()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string

  @IsOptional()
  @IsEnum(BlogStatus, { message: 'status must be draft, published, or archived' })
  status?: BlogStatus = BlogStatus.DRAFT

  @nullToUndef()
  @IsOptional()
  @IsString()
  @MaxLength(160, { message: 'meta_description must not exceed 160 characters' })
  meta_description?: string

  @nullToUndef()
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'meta_keywords must not exceed 500 characters' })
  meta_keywords?: string

  @IsOptional()
  @IsBoolean()
  featured?: boolean = false
}
