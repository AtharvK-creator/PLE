import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireFeatureFlag } from '../../common/decorators/feature-flag.decorator';
import { JwtPayload } from '@ple/types';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, FeatureFlagGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @RequireFeatureFlag('dashboard')
  @ApiOperation({ summary: 'Get aggregated dashboard statistics' })
  getStats(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getStats(user.sub);
  }
}
