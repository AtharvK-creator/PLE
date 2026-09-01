import { IsOptional, IsString, MaxLength, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiPropertyOptional({ example: 'Understanding Binary Trees' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ enum: ['LEARN', 'CODE'], default: 'LEARN' })
  @IsOptional()
  @IsEnum(['LEARN', 'CODE'])
  mode?: 'LEARN' | 'CODE';
}
