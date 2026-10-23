import { IsString, IsNotEmpty, IsNumber, Min, IsIn } from 'class-validator';

export class SubmitAttemptDto {
  @IsString()
  @IsNotEmpty()
  submittedAnswer: string;

  @IsString()
  @IsNotEmpty()
  reflectionWhy: string;

  @IsString()
  @IsNotEmpty()
  reflectionAlternatives: string;

  @IsString()
  @IsNotEmpty()
  reflectionAssumptions: string;

  @IsString()
  @IsNotEmpty()
  reflectionFailures: string;

  @IsString()
  @IsNotEmpty()
  reflectionImprovement: string;

  @IsString()
  @IsNotEmpty()
  reflectionTradeoffs: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['Very Low', 'Low', 'Medium', 'High', 'Very High'])
  confidenceLevel: string;

  @IsNumber()
  @Min(0)
  thinkingTimeSeconds: number;
}
