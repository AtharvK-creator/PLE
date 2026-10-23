import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = request;
    const requestId = (request.headers['x-request-id'] as string) || uuidv4();
    const userAgent = request.headers['user-agent'] || '';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<{ statusCode: number }>();
          const duration = Date.now() - startTime;
          this.logger.log(
            `[${requestId}] ${method} ${url} ${response.statusCode} ${duration}ms - ${ip} "${userAgent}"`,
          );
        },
        error: () => {
          const duration = Date.now() - startTime;
          this.logger.error(`[${requestId}] ${method} ${url} ERROR ${duration}ms`);
        },
      }),
    );
  }
}
