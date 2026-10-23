import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddUserSkillDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  skillId: string;

  @ApiProperty({ enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] })
  @IsEnum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
}
