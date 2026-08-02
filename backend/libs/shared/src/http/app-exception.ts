import { HttpException, HttpStatus } from '@nestjs/common';
import { DomainError } from '../kernel/result';

/** HttpException that carries a stable machine code through to the envelope. */
export class AppException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus,
    public readonly details?: unknown,
  ) {
    super(message, status);
  }

  static fromDomain(error: DomainError, status: HttpStatus = HttpStatus.UNPROCESSABLE_ENTITY): AppException {
    return new AppException(error.code, error.message, status, error.details);
  }
}
