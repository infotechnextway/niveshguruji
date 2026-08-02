import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { AppException } from './app-exception';
import { ApiFailure } from './api-envelope';

/**
 * Single place where every error becomes the API failure envelope.
 * Unknown errors are logged with a correlation id and returned as INTERNAL
 * without leaking internals (NFR-5).
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: ApiFailure = {
      success: false,
      error: { code: 'INTERNAL', message: 'An unexpected error occurred' },
    };

    if (exception instanceof AppException) {
      status = exception.getStatus();
      body = {
        success: false,
        error: { code: exception.code, message: exception.message, details: exception.details },
      };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : ((response as Record<string, unknown>).message as string | string[] | undefined) ??
            exception.message;
      body = {
        success: false,
        error: {
          code: httpStatusToCode(status),
          message: Array.isArray(message) ? 'Validation failed' : String(message),
          details: Array.isArray(message) ? message : undefined,
        },
      };
    } else {
      const err = exception as Error;
      this.logger.error(err?.message ?? 'Unknown error', err?.stack);
      if (process.env.NODE_ENV !== 'production') {
        body = {
          success: false,
          error: {
            code: 'INTERNAL',
            message: err?.message?.trim() || 'An unexpected error occurred',
          },
        };
      }
    }

    res.status(status).json(body);
  }
}

function httpStatusToCode(status: number): string {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'UNPROCESSABLE';
    case 429:
      return 'RATE_LIMITED';
    default:
      return 'HTTP_' + status;
  }
}
