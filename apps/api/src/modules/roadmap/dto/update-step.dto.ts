import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStepDto {
  @ApiProperty()
  @IsBoolean()
  isCompleted: boolean;
}
