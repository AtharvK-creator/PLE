import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LearningGoalsService } from './learning-goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '@ple/types';

@ApiTags('Learning Goals')
@Controller('learning-goals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LearningGoalsController {
  constructor(private readonly goalsService: LearningGoalsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all learning goals' })
  getAll(@CurrentUser() user: JwtPayload) {
    return this.goalsService.getAll(user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new learning goal' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateGoalDto) {
    return this.goalsService.create(user.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a learning goal' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.goalsService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a learning goal' })
  delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.goalsService.delete(user.sub, id);
  }
}
