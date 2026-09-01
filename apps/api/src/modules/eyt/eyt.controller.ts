import { Controller, Get, Post, Body, Param, Query, UseGuards, Put } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EytService } from './eyt.service';
import { ChallengeIntelligenceService } from './challenge-intelligence.service';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import { SubmitReflectionDto } from './dto/submit-reflection.dto';
import { QueryChallengesDto } from './dto/query-challenges.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireFeatureFlag } from '../../common/decorators/feature-flag.decorator';
import { JwtPayload } from '@ple/types';
import { EytDifficulty } from '@prisma/client';

@ApiTags('Enhance Your Thinking (EYT)')
@Controller('eyt')
@UseGuards(JwtAuthGuard, FeatureFlagGuard)
@ApiBearerAuth()
@RequireFeatureFlag('eyt')
export class EytController {
  constructor(
    private readonly eytService: EytService,
    private readonly challengeIntelligenceService: ChallengeIntelligenceService
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get current student EYT stats, radar dimensions, recommended difficulty, and achievements' })
  getDashboard(@CurrentUser() user: JwtPayload) {
    return this.eytService.getDashboard(user.sub);
  }

  @Get('challenges')
  @ApiOperation({ summary: 'Get paginated catalog list of all EYT challenges with completion flags and search filters' })
  getChallenges(@CurrentUser() user: JwtPayload, @Query() query: QueryChallengesDto) {
    return this.eytService.getChallenges(user.sub, query);
  }

  @Get('challenges/:id')
  @ApiOperation({ summary: 'Get detailed challenge information' })
  getChallenge(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.eytService.getChallenge(user.sub, id);
  }

  @Post('challenges/:id/stage1')
  @ApiOperation({ summary: 'Submit initial solution draft' })
  submitStage1(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SubmitAttemptDto
  ) {
    return this.eytService.submitStage1(user.sub, id, dto);
  }

  @Post('attempts/:attemptId/stage2')
  @ApiOperation({ summary: 'Submit post-submission reflection and evaluate' })
  submitStage2(
    @CurrentUser() user: JwtPayload,
    @Param('attemptId') attemptId: string,
    @Body() dto: SubmitReflectionDto
  ) {
    return this.eytService.submitStage2(user.sub, attemptId, dto);
  }

  @Post('challenges/:id/favorite')
  @ApiOperation({ summary: 'Toggle favorite status for a challenge' })
  toggleFavorite(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.eytService.toggleFavorite(user.sub, id);
  }

  @Post('challenges/:id/rate')
  @ApiOperation({ summary: 'Submit rating for a challenge' })
  submitRating(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body('rating') rating: number
  ) {
    return this.eytService.submitRating(user.sub, id, rating);
  }

  @Get('challenges/:id/discussions')
  @ApiOperation({ summary: 'Get discussions for a challenge' })
  getDiscussions(@Param('id') id: string) {
    return this.eytService.getDiscussions(id);
  }

  @Post('challenges/:id/discussions')
  @ApiOperation({ summary: 'Post comment to challenge discussion' })
  postDiscussion(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body('content') content: string
  ) {
    return this.eytService.postDiscussion(user.sub, id, content);
  }

  @Get('seasons')
  @ApiOperation({ summary: 'Get active and past seasons list' })
  getSeasons(@CurrentUser() user: JwtPayload) {
    return this.eytService.getSeasons(user.sub);
  }

  @Get('collections')
  @ApiOperation({ summary: 'Get all challenge collections' })
  getCollections() {
    return this.eytService.getCollections();
  }

  @Get('collections/:id')
  @ApiOperation({ summary: 'Get collection details by ID' })
  getCollection(@Param('id') id: string) {
    return this.eytService.getCollection(id);
  }

  @Get('learning-paths')
  @ApiOperation({ summary: 'Get all learning paths' })
  getLearningPaths() {
    return this.eytService.getLearningPaths();
  }

  @Get('learning-paths/:id')
  @ApiOperation({ summary: 'Get learning path details by ID' })
  getLearningPath(@Param('id') id: string) {
    return this.eytService.getLearningPath(id);
  }

  @Get('challenge-packs')
  @ApiOperation({ summary: 'Get all challenge packs' })
  getChallengePacks() {
    return this.eytService.getChallengePacks();
  }

  @Get('challenge-packs/:id')
  @ApiOperation({ summary: 'Get challenge pack details by ID' })
  getChallengePack(@Param('id') id: string) {
    return this.eytService.getChallengePack(id);
  }

  @Get('archives')
  @ApiOperation({ summary: 'Get all archived and past weekly challenges' })
  getArchives() {
    return this.eytService.getArchives();
  }

  @Post('challenges/:id/vote-difficulty')
  @ApiOperation({ summary: 'Submit user difficulty vote' })
  voteDifficulty(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body('difficulty') difficulty: string
  ) {
    const diffUpper = difficulty.toUpperCase() as EytDifficulty;
    return this.eytService.voteDifficulty(user.sub, id, diffUpper);
  }

  // ============================================
  // ADMIN ONLY ENDPOINTS
  // ============================================

  @Post('admin/ingest')
  @ApiOperation({ summary: 'Admin: Trigger weekly challenge ingestion pipeline' })
  async triggerIngestion(
    @CurrentUser() user: JwtPayload,
    @Query('week') week?: number,
    @Query('year') year?: number
  ) {
    this.eytService.verifyAdmin(user.role);
    const w = week || 28;
    const y = year || 2026;
    const count = await this.challengeIntelligenceService.ingestWeeklyPool(w, y);
    return { success: true, ingestedCount: count };
  }

  @Get('admin/console')
  @ApiOperation({ summary: 'Admin: Challenge Intelligence Console metrics' })
  getAdminConsole(@CurrentUser() user: JwtPayload) {
    this.eytService.verifyAdmin(user.role);
    return this.eytService.getAdminConsoleMetrics();
  }

  @Put('admin/edit-challenge/:id')
  @ApiOperation({ summary: 'Admin: Edit challenge details with version history' })
  editChallenge(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: any
  ) {
    this.eytService.verifyAdmin(user.role);
    return this.eytService.editChallenge(user.sub, id, body);
  }
}
