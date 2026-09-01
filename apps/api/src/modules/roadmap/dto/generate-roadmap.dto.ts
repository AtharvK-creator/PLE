import { IsString, IsNotEmpty, IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateRoadmapDto {
  @ApiProperty({ example: 'AI/ML Engineer' })
  @IsString()
  @IsNotEmpty()
  goal: string;

  @ApiProperty({ example: 'Computer Science Engineering' })
  @IsString()
  @IsNotEmpty()
  branch: string;

  @ApiProperty({ example: 4, minimum: 1, maximum: 8 })
  @IsInt()
  @Min(1)
  @Max(8)
  semester: number;

  @ApiPropertyOptional({ enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] })
  @IsOptional()
  @IsEnum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
  currentSkillLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
}
