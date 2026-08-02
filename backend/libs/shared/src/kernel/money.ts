import { DomainError, Result } from './result';

/**
 * Money — immutable value object. Stored and computed as INTEGER PAISE (ADR-4).
 * Never construct from floats except via fromRupees, which rounds half-away-from-zero.
 */
export class Money {
  private constructor(public readonly paise: number) {
    if (!Number.isSafeInteger(paise)) {
      throw new Error(`Money must be a safe integer number of paise, got ${paise}`);
    }
  }

  static readonly ZERO = new Money(0);

  static fromPaise(paise: number): Result<Money> {
    if (!Number.isSafeInteger(paise)) {
      return Result.fail(DomainError.of('MONEY_INVALID', 'Amount must be an integer number of paise'));
    }
    return Result.ok(new Money(paise));
  }

  /** Accepts rupees (may carry decimals); rounds half-away-from-zero to paise. */
  static fromRupees(rupees: number): Result<Money> {
    if (!Number.isFinite(rupees)) {
      return Result.fail(DomainError.of('MONEY_INVALID', 'Amount must be a finite number'));
    }
    const paise = Math.sign(rupees) * Math.round(Math.abs(rupees) * 100);
    if (!Number.isSafeInteger(paise)) {
      return Result.fail(DomainError.of('MONEY_OVERFLOW', 'Amount exceeds safe integer range'));
    }
    return Result.ok(new Money(paise));
  }

  /** Trusted constructor for values already validated (e.g. read from DB schema). */
  static unsafeFromPaise(paise: number): Money {
    return new Money(paise);
  }

  add(other: Money): Money {
    return new Money(this.paise + other.paise);
  }

  subtract(other: Money): Money {
    return new Money(this.paise - other.paise);
  }

  /** Multiply by a scalar (e.g. quantity); rounds half-away-from-zero to the paisa. */
  times(scalar: number): Money {
    const raw = this.paise * scalar;
    const rounded = Math.sign(raw) * Math.round(Math.abs(raw));
    if (!Number.isSafeInteger(rounded)) {
      throw new Error('Money multiplication overflow');
    }
    return new Money(rounded);
  }

  /** Percentage of this amount in basis points (100 bps = 1%). */
  bps(basisPoints: number): Money {
    return this.times(basisPoints / 10_000);
  }

  negate(): Money {
    return new Money(-this.paise);
  }

  get isNegative(): boolean {
    return this.paise < 0;
  }

  get isZero(): boolean {
    return this.paise === 0;
  }

  gte(other: Money): boolean {
    return this.paise >= other.paise;
  }

  lte(other: Money): boolean {
    return this.paise <= other.paise;
  }

  equals(other: Money): boolean {
    return this.paise === other.paise;
  }

  get rupees(): number {
    return this.paise / 100;
  }

  /** "₹1,23,456.78" — Indian digit grouping. */
  format(): string {
    const abs = Math.abs(this.paise);
    const rupees = Math.floor(abs / 100);
    const p = (abs % 100).toString().padStart(2, '0');
    return `${this.paise < 0 ? '-' : ''}₹${rupees.toLocaleString('en-IN')}.${p}`;
  }

  toJSON(): number {
    return this.paise;
  }
}
