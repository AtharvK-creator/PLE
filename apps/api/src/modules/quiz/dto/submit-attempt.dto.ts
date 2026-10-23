import { IsArray, IsInt, Min, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AnswerDto {
  @IsString()
  questionId: string;

  @IsString()
  selectedOptionId: string;
}

export class SubmitAttemptDto {
  @ApiProperty({ type: [AnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  timeTakenSeconds: number;
}
