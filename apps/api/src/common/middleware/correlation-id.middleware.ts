import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface CorrelatedRequest extends Request {
  correlationId?: string;
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: CorrelatedRequest, res: Response, next: NextFunction) {
    const existingId = req.header('x-correlation-id') || req.header('x-request-id');
    const correlationId = existingId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    req.correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    
    next();
  }
}
