import { Controller, Get, Post, Delete, Patch, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SkillsService } from './skills.service';
import { AddUserSkillDto } from './dto/add-user-skill.dto';
import { UpdateSubtopicProgressDto } from './dto/update-subtopic-progress.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '@ple/types';

@ApiTags('Skills')
@Controller('skills')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Browse the global skill catalog' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  getCatalog(@Query('search') search?: string, @Query('category') category?: string) {
    return this.skillsService.getCatalog(search, category);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my skill profile' })
  getUserSkills(@CurrentUser() user: JwtPayload) {
    return this.skillsService.getUserSkills(user.sub);
  }

  @Post('me')
  @ApiOperation({ summary: 'Add or update a skill in my profile' })
  addUserSkill(@CurrentUser() user: JwtPayload, @Body() dto: AddUserSkillDto) {
    return this.skillsService.addUserSkill(user.sub, dto);
  }

  @Delete('me/:skillId')
  @ApiOperation({ summary: 'Remove a skill from my profile' })
  removeUserSkill(@CurrentUser() user: JwtPayload, @Param('skillId') skillId: string) {
    return this.skillsService.removeUserSkill(user.sub, skillId);
  }

  @Patch('me/:skillId/subtopics')
  @ApiOperation({ summary: 'Update subtopic completion progress' })
  updateSubtopicProgress(
    @CurrentUser() user: JwtPayload,
    @Param('skillId') skillId: string,
    @Body() dto: UpdateSubtopicProgressDto,
  ) {
    return this.skillsService.updateSubtopicProgress(user.sub, skillId, dto);
  }
}
