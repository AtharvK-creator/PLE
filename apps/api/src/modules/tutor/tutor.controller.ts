import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname, join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { TutorService } from './tutor.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireFeatureFlag } from '../../common/decorators/feature-flag.decorator';
import { JwtPayload } from '@ple/types';

@ApiTags('AI Tutor')
@Controller('tutor')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, ThrottlerGuard)
@ApiBearerAuth()
export class TutorController {
  constructor(private readonly tutorService: TutorService) {}

  @Post('sessions')
  @RequireFeatureFlag('aiTutor')
  @Throttle({ global: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Create a new AI tutor session' })
  createSession(@CurrentUser() user: JwtPayload, @Body() dto: CreateSessionDto) {
    return this.tutorService.createSession(user.sub, dto);
  }

  @Get('sessions')
  @RequireFeatureFlag('aiTutor')
  @ApiQuery({ name: 'mode', required: false, enum: ['LEARN', 'CODE'], description: 'Filter by tutor mode' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Sessions per page (default: 20)' })
  @ApiOperation({ summary: 'Get all tutor sessions' })
  getSessions(
    @CurrentUser() user: JwtPayload,
    @Query('mode') mode?: 'LEARN' | 'CODE',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.tutorService.getSessions(user.sub, mode, parsedPage, parsedLimit);
  }

  @Get('sessions/:id')
  @RequireFeatureFlag('aiTutor')
  @ApiOperation({ summary: 'Get a session with its full message history' })
  getSession(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.tutorService.getSession(user.sub, id);
  }

  @Post('sessions/:id/messages')
  @RequireFeatureFlag('aiTutor')
  @Throttle({ ai: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Send a message (non-streaming response)' })
  sendMessage(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.tutorService.sendMessage(user.sub, id, dto);
  }

  @Post('sessions/:id/stream')
  @RequireFeatureFlag('aiTutor')
  @Throttle({ ai: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Send a message and stream the AI response' })
  async streamMessage(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      const streamGen = this.tutorService.streamMessage(user.sub, id, dto);
      for await (const chunk of streamGen) {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }

  @Delete('sessions/:id')
  @RequireFeatureFlag('aiTutor')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tutor session' })
  deleteSession(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.tutorService.deleteSession(user.sub, id);
  }

  @Post('upload')
  @RequireFeatureFlag('aiTutor')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req: any, file: any, cb: any) => {
        const allowedTypes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.ms-powerpoint',
          'image/jpeg',
          'image/png',
          'image/webp',
        ];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Unsupported file format. Please upload PDF, Word, PowerPoint, or Images.'), false);
        }
      },
    }),
  )
  @ApiOperation({ summary: 'Upload file attachment for AI tutor session' })
  uploadAttachment(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const uploadDir = join(process.cwd(), 'uploads', 'tutor');
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    const filename = `${uniqueSuffix}${ext}`;

    try {
      writeFileSync(join(uploadDir, filename), file.buffer);
    } catch (err: any) {
      throw new BadRequestException(`Failed to save uploaded file: ${err.message}`);
    }

    return {
      url: `/uploads/tutor/${filename}`,
      name: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }
}
