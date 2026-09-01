import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RoadmapService } from './roadmap.service';
import { GenerateRoadmapDto } from './dto/generate-roadmap.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireFeatureFlag } from '../../common/decorators/feature-flag.decorator';
import { JwtPayload } from '@ple/types';

@ApiTags('Roadmap')
@Controller('roadmap')
@UseGuards(JwtAuthGuard, FeatureFlagGuard)
@ApiBearerAuth()
export class RoadmapController {
  constructor(private readonly roadmapService: RoadmapService) {}

  @Post('generate')
  @RequireFeatureFlag('roadmap')
  @ApiOperation({ summary: 'Generate a personalized AI learning roadmap' })
  generate(@CurrentUser() user: JwtPayload, @Body() dto: GenerateRoadmapDto) {
    return this.roadmapService.generate(user.sub, dto);
  }

  @Get()
  @RequireFeatureFlag('roadmap')
  @ApiOperation({ summary: 'Get all roadmaps' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.roadmapService.findAll(user.sub);
  }

  @Get(':id')
  @RequireFeatureFlag('roadmap')
  @ApiOperation({ summary: 'Get a specific roadmap with all steps' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.roadmapService.findById(user.sub, id);
  }

  @Patch(':roadmapId/steps/:stepId')
  @RequireFeatureFlag('roadmap')
  @ApiOperation({ summary: 'Mark a step as complete or incomplete' })
  updateStep(
    @CurrentUser() user: JwtPayload,
    @Param('roadmapId') roadmapId: string,
    @Param('stepId') stepId: string,
    @Body() dto: UpdateStepDto,
  ) {
    return this.roadmapService.updateStep(user.sub, roadmapId, stepId, dto);
  }

  @Patch(':id/archive')
  @RequireFeatureFlag('roadmap')
  @ApiOperation({ summary: 'Archive a roadmap' })
  archive(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.roadmapService.archive(user.sub, id);
  }
}
