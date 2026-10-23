import { IsString, IsOptional, IsDateString, IsEnum, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGoalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'COMPLETED', 'PAUSED'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'COMPLETED', 'PAUSED'])
  status?: 'ACTIVE' | 'COMPLETED' | 'PAUSED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roadmapId?: string;
}
