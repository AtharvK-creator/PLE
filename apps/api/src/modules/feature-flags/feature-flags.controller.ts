import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FeatureFlagsService } from './feature-flags.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Feature Flags')
@Controller('feature-flags')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  /**
   * Public endpoint — the frontend reads flags before the user has a JWT.
   * Returns all feature flags ordered alphabetically.
   */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all feature flags (public)' })
  async getAll() {
    return this.featureFlagsService.getAll();
  }
}
