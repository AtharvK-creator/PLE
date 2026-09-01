import { Module } from '@nestjs/common';
import { LearningGoalsService } from './learning-goals.service';
import { LearningGoalsController } from './learning-goals.controller';

@Module({
  providers: [LearningGoalsService],
  controllers: [LearningGoalsController],
})
export class LearningGoalsModule {}
