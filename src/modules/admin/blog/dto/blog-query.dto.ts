import { Type } from 'class-transformer'
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { BlogStatus } from './blog-status.enum'

export class BlogQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsEnum(BlogStatus, { message: 'status must be draft, published, or archived' })
  status?: BlogStatus

  @IsOptional()
  @IsString()
  startDate?: string // ISO 8601 date string

  @IsOptional()
  @IsString()
  endDate?: string // ISO 8601 date string

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  featured?: boolean

  @IsOptional()
  @IsString()
  @IsEnum(['created_at', 'updated_at', 'title', 'reading_time_minutes'], {
    message: 'sort must be created_at, updated_at, title, or reading_time_minutes',
  })
  sort?: 'created_at' | 'updated_at' | 'title' | 'reading_time_minutes' = 'created_at'

  @IsOptional()
  @IsString()
  @IsEnum(['asc', 'desc'], { message: 'order must be asc or desc' })
  order?: 'asc' | 'desc' = 'desc'
}
