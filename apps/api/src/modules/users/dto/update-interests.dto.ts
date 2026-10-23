import { IsArray, IsString, MinLength, MaxLength, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateInterestsDto {
  @ApiProperty({ type: [String], example: ['Machine Learning', 'Web Development'] })
  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(100, { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  topics: string[];
}
