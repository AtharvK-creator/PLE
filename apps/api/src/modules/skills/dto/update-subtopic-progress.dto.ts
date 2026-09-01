import { IsString, IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSubtopicProgressDto {
  @ApiProperty({ example: 'Components & Props' })
  @IsString()
  @IsNotEmpty()
  subtopicName: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isCompleted: boolean;
}
