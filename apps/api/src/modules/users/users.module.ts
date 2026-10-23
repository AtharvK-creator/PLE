import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AvatarStorageService } from './avatar-storage.service';
import { LocalAvatarStorageService } from './local-avatar-storage.service';

@Module({
  providers: [
    UsersService,
    {
      provide: AvatarStorageService,
      useClass: LocalAvatarStorageService,
    },
  ],
  controllers: [UsersController],
  exports: [UsersService, AvatarStorageService],
})
export class UsersModule {}
