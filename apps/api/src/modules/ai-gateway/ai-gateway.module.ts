import { Module, Global } from '@nestjs/common';
import { AIGatewayService } from './ai-gateway.service';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';

@Global()
@Module({
  providers: [GeminiProvider, GroqProvider, AIGatewayService],
  exports: [AIGatewayService],
})
export class AIGatewayModule {}
