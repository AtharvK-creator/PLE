import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryChallengesDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  difficulty?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  skill?: string;

  @IsString()
  @IsOptional()
  pathId?: string;

  @IsString()
  @IsOptional()
  packId?: string;

  @IsString()
  @IsOptional()
  collectionId?: string;

  @IsString()
  @IsOptional()
  thinkingDomain?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  minTime?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  maxTime?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  week?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  month?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  year?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  season?: number;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 10;
}
