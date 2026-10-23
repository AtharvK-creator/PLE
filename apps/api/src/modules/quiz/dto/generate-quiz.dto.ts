import { IsString, IsNotEmpty, IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateQuizDto {
  @ApiProperty({ example: 'Binary Trees' })
  @IsString()
  @IsNotEmpty()
  topic: string;

  @ApiProperty({ example: 'Data Structures & Algorithms' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ enum: ['EASY', 'MEDIUM', 'HARD'] })
  @IsEnum(['EASY', 'MEDIUM', 'HARD'])
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';

  @ApiPropertyOptional({ minimum: 5, maximum: 20, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(20)
  totalQuestions?: number;
}
