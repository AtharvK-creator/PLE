import { Controller, Get, Patch, Post, Delete, Body, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateInterestsDto } from './dto/update-interests.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '@ple/types';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user with full profile' })
  getMe(@CurrentUser() user: JwtPayload) {
    return this.usersService.findById(user.sub);
  }

  @Patch('me/profile')
  @ApiOperation({ summary: 'Update user profile' })
  updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Patch('me/interests')
  @ApiOperation({ summary: 'Update user learning interests' })
  updateInterests(@CurrentUser() user: JwtPayload, @Body() dto: UpdateInterestsDto) {
    return this.usersService.updateInterests(user.sub, dto);
  }

  @Post('me/resume/regenerate')
  @ApiOperation({ summary: 'Regenerate user AI resume dynamically' })
  regenerateResume(@CurrentUser() user: JwtPayload) {
    return this.usersService.generateResume(user.sub);
  }

  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return callback(
            new BadRequestException('Invalid file type. Supported formats: jpg, jpeg, png, webp'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  @ApiOperation({ summary: 'Upload user profile avatar' })
  async uploadAvatar(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const avatarUrl = await this.usersService.updateAvatar(user.sub, file);
    return { avatarUrl };
  }

  @Delete('me/avatar')
  @ApiOperation({ summary: 'Remove user profile avatar' })
  async removeAvatar(@CurrentUser() user: JwtPayload) {
    await this.usersService.removeAvatar(user.sub);
    return { message: 'Avatar removed successfully' };
  }
}
