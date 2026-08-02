/**
 * Result<T, E> — explicit success/failure without exceptions in the domain layer.
 * Domain and application code return Result; only the presentation layer converts
 * failures into HTTP errors.
 */
export class DomainError {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly details?: Record<string, unknown>,
  ) {}

  static of(code: string, message: string, details?: Record<string, unknown>): DomainError {
    return new DomainError(code, message, details);
  }
}

export class Result<T, E = DomainError> {
  private constructor(
    private readonly _ok: boolean,
    private readonly _value?: T,
    private readonly _error?: E,
  ) {}

  static ok<T, E = DomainError>(value: T): Result<T, E> {
    return new Result<T, E>(true, value);
  }

  static fail<T, E = DomainError>(error: E): Result<T, E> {
    return new Result<T, E>(false, undefined, error);
  }

  get isOk(): boolean {
    return this._ok;
  }

  get isFail(): boolean {
    return !this._ok;
  }

  get value(): T {
    if (!this._ok) throw new Error('Cannot read value of a failed Result');
    return this._value as T;
  }

  get error(): E {
    if (this._ok) throw new Error('Cannot read error of a successful Result');
    return this._error as E;
  }

  map<U>(fn: (v: T) => U): Result<U, E> {
    return this._ok ? Result.ok<U, E>(fn(this._value as T)) : Result.fail<U, E>(this._error as E);
  }

  flatMap<U>(fn: (v: T) => Result<U, E>): Result<U, E> {
    return this._ok ? fn(this._value as T) : Result.fail<U, E>(this._error as E);
  }
}
