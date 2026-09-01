import { Module } from '@nestjs/common';
import { TutorService } from './tutor.service';
import { TutorController } from './tutor.controller';
import { IntelligenceModule } from '../intelligence/intelligence.module';

@Module({
  imports: [IntelligenceModule],
  providers: [TutorService],
  controllers: [TutorController],
})
export class TutorModule {}
