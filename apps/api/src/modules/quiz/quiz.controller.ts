import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QuizService } from './quiz.service';
import { GenerateQuizDto } from './dto/generate-quiz.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireFeatureFlag } from '../../common/decorators/feature-flag.decorator';
import { JwtPayload } from '@ple/types';

@ApiTags('Quiz')
@Controller('quiz')
@UseGuards(JwtAuthGuard, FeatureFlagGuard)
@ApiBearerAuth()
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post('generate')
  @RequireFeatureFlag('quizzes')
  @ApiOperation({ summary: 'Generate an AI quiz on a topic' })
  generate(@CurrentUser() user: JwtPayload, @Body() dto: GenerateQuizDto) {
    return this.quizService.generate(user.sub, dto);
  }

  @Get()
  @RequireFeatureFlag('quizzes')
  @ApiOperation({ summary: 'Get all quizzes' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.quizService.findAll(user.sub);
  }

  @Get('attempts')
  @RequireFeatureFlag('quizzes')
  @ApiOperation({ summary: 'Get quiz attempt history' })
  getAttemptHistory(@CurrentUser() user: JwtPayload) {
    return this.quizService.getAttemptHistory(user.sub);
  }

  @Get(':id')
  @RequireFeatureFlag('quizzes')
  @ApiOperation({ summary: 'Get a specific quiz with questions' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.quizService.findById(user.sub, id);
  }

  @Post(':id/attempt')
  @RequireFeatureFlag('quizzes')
  @ApiOperation({ summary: 'Submit a quiz attempt and get results' })
  submitAttempt(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SubmitAttemptDto,
  ) {
    return this.quizService.submitAttempt(user.sub, id, dto);
  }
}
