import { Controller, Get, Post, Delete, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NewsService } from './news.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '@ple/types';

@ApiTags('News')
@Controller('news')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  @ApiOperation({ summary: 'Get tech & engineering news by category' })
  getNews(
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.newsService.getNews(category || 'technology', search || '');
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending technology & AI news' })
  getTrendingNews() {
    return this.newsService.getTrendingNews();
  }

  @Get('for-you')
  @ApiOperation({ summary: 'Get personalized tech news feed' })
  getPersonalizedNews(@CurrentUser() user: JwtPayload) {
    return this.newsService.getPersonalizedNews(user.sub);
  }

  @Get('ai-watch')
  @ApiOperation({ summary: 'Get AI Watch news tracking top labs' })
  getAIWatchNews() {
    return this.newsService.getAIWatchNews();
  }

  @Get('saved')
  @ApiOperation({ summary: 'Get saved news articles' })
  getSavedArticles(@CurrentUser() user: JwtPayload) {
    return this.newsService.getSavedArticles(user.sub);
  }

  @Post('saved')
  @ApiOperation({ summary: 'Save/Bookmark a news article' })
  saveArticle(
    @CurrentUser() user: JwtPayload,
    @Body() dto: { title: string; url: string; source?: string; imageUrl?: string; summary?: string; category?: string; publishedAt?: string },
  ) {
    return this.newsService.saveArticle(user.sub, dto);
  }

  @Post('summarize')
  @ApiOperation({ summary: 'Summarize a news article with MIKE' })
  summarizeArticle(
    @CurrentUser() user: JwtPayload,
    @Body() dto: { title: string; url: string; summary?: string },
  ) {
    return this.newsService.summarizeArticle(user.sub, dto);
  }

  @Delete('saved/:id')
  @ApiOperation({ summary: 'Unsave a news article' })
  unsaveArticle(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.newsService.unsaveArticle(user.sub, id);
  }
}
