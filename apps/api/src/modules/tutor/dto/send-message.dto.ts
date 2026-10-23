import { IsString, MinLength, MaxLength, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 'Can you explain how binary search trees work?' })
  @IsString()
  @MinLength(1, { message: 'Message cannot be empty' })
  @MaxLength(4000, { message: 'Message is too long (max 4000 characters)' })
  content: string;

  @ApiPropertyOptional({ example: false, description: 'Trigger expert review mode' })
  @IsOptional()
  @IsBoolean()
  expertMode?: boolean;

  @ApiPropertyOptional({ description: 'Optional file attachment details' })
  @IsOptional()
  file?: {
    url: string;
    name: string;
    mimeType: string;
    size: number;
  };
}
