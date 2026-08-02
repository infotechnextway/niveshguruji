import { DomainError, Result } from './result';

/** Quantity — positive integer units. */
export class Quantity {
  private constructor(public readonly value: number) {}

  static of(value: number): Result<Quantity> {
    if (!Number.isSafeInteger(value) || value <= 0) {
      return Result.fail(DomainError.of('QTY_INVALID', 'Quantity must be a positive integer'));
    }
    return Result.ok(new Quantity(value));
  }

  /** Validates the quantity is a whole multiple of the instrument lot size. */
  static ofLots(value: number, lotSize: number): Result<Quantity> {
    const base = Quantity.of(value);
    if (base.isFail) return base;
    if (!Number.isSafeInteger(lotSize) || lotSize <= 0) {
      return Result.fail(DomainError.of('LOT_SIZE_INVALID', 'Lot size must be a positive integer'));
    }
    if (value % lotSize !== 0) {
      return Result.fail(
        DomainError.of('QTY_LOT_MISMATCH', `Quantity must be a multiple of lot size ${lotSize}`, { lotSize }),
      );
    }
    return base;
  }

  toJSON(): number {
    return this.value;
  }
}
