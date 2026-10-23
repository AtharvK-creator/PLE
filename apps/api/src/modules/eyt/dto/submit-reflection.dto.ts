import { IsString, IsNotEmpty } from 'class-validator';

export class SubmitReflectionDto {
  @IsString()
  @IsNotEmpty()
  reflectionAfterSubmission: string;
}
