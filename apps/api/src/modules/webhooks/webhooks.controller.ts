import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';
import { EnvConfig } from '../../config/env.validation';

@ApiTags('Webhooks (n8n)')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly configService: ConfigService<EnvConfig>) {}

  private verifySecret(secret: string | undefined): void {
    const expectedSecret = this.configService.get('N8N_WEBHOOK_SECRET', { infer: true });
    if (expectedSecret && secret !== expectedSecret) {
      throw new UnauthorizedException('Invalid webhook secret');
    }
  }

  @Public()
  @Post('welcome')
  @ApiOperation({ summary: 'n8n: trigger welcome email for new user' })
  welcome(
    @Body() body: { userId: string; email: string; name: string },
    @Headers('x-webhook-secret') secret: string,
  ) {
    this.verifySecret(secret);
    this.logger.log(`Welcome webhook triggered for user ${body.userId}`);
    return { received: true, event: 'welcome', userId: body.userId };
  }

  @Public()
  @Post('reminder')
  @ApiOperation({ summary: 'n8n: trigger daily learning reminder' })
  reminder(
    @Body() body: { userId: string; email: string },
    @Headers('x-webhook-secret') secret: string,
  ) {
    this.verifySecret(secret);
    this.logger.log(`Reminder webhook triggered for user ${body.userId}`);
    return { received: true, event: 'reminder', userId: body.userId };
  }

  @Public()
  @Post('weekly-report')
  @ApiOperation({ summary: 'n8n: trigger weekly progress report' })
  weeklyReport(
    @Body() body: { userId: string; email: string; stats: Record<string, unknown> },
    @Headers('x-webhook-secret') secret: string,
  ) {
    this.verifySecret(secret);
    this.logger.log(`Weekly report webhook triggered for user ${body.userId}`);
    return { received: true, event: 'weekly-report', userId: body.userId };
  }
}
