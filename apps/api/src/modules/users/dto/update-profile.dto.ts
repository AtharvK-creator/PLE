import { IsString, IsInt, Min, Max, IsEnum, IsOptional, IsUrl, MaxLength, IsArray, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  branch?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 8 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  semester?: number;

  @ApiPropertyOptional({ enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] })
  @IsOptional()
  @IsEnum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
  skillLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  careerGoal?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  knowledgeDomains?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  domainSkillLevels?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  learningStyle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  careerAwarenessAnswers?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectExperience?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  internshipExperience?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  interviewReadiness?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  careerReadinessScore?: number;
}
