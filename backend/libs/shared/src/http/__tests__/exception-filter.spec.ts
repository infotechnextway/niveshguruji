import { HttpStatus, NotFoundException } from '@nestjs/common';
import { GlobalExceptionFilter } from '../global-exception.filter';
import { AppException } from '../app-exception';
import { DomainError } from '../../kernel/result';

function mockHost() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => res }),
  } as never;
  return { res, host };
}

describe('GlobalExceptionFilter (envelope contract)', () => {
  const filter = new GlobalExceptionFilter();

  it('maps AppException with its machine code', () => {
    const { res, host } = mockHost();
    filter.catch(
      AppException.fromDomain(DomainError.of('QTY_LOT_MISMATCH', 'bad lot', { lotSize: 75 })),
      host,
    );
    expect(res.statusCode).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'QTY_LOT_MISMATCH', message: 'bad lot', details: { lotSize: 75 } },
    });
  });

  it('maps framework HttpExceptions to stable codes', () => {
    const { res, host } = mockHost();
    filter.catch(new NotFoundException('missing'), host);
    expect(res.statusCode).toBe(404);
    expect((res.body as { error: { code: string } }).error.code).toBe('NOT_FOUND');
  });

  it('never leaks unknown error internals in production', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const { res, host } = mockHost();
      filter.catch(new Error('secret stack detail'), host);
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({
        success: false,
        error: { code: 'INTERNAL', message: 'An unexpected error occurred' },
      });
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('surfaces unknown error message in non-production', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      const { res, host } = mockHost();
      filter.catch(new Error('catalog sort failed'), host);
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({
        success: false,
        error: { code: 'INTERNAL', message: 'catalog sort failed' },
      });
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});
