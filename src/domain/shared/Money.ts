import { DomainError } from './DomainError';
import { err, ok, type Result } from './Result';

export class Money {
  private constructor(
    public readonly cents: number, // paise
    public readonly currency: string,
  ) {}

  static fromCents(
    cents: number,
    currency = 'INR',
  ): Result<Money, DomainError> {
    if (!Number.isInteger(cents)) {
      return err(
        DomainError.validation(
          'Money must be an integer number of paise',
          { cents: String(cents) },
        ),
      );
    }

    if (cents < 0) {
      return err(
        DomainError.validation(
          'Money cannot be negative',
          { cents: String(cents) },
        ),
      );
    }

    if (!/^[A-Z]{3}$/.test(currency)) {
      return err(
        DomainError.validation(
          'Currency must be a 3-letter ISO code',
          { currency },
        ),
      );
    }

    return ok(new Money(cents, currency));
  }

  static zero(currency = 'INR'): Money {
    return new Money(0, currency);
  }

  add(other: Money): Result<Money, DomainError> {
    if (other.currency !== this.currency) {
      return err(
        DomainError.businessRule(
          `Cannot add ${other.currency} to ${this.currency}`,
        ),
      );
    }

    return ok(new Money(this.cents + other.cents, this.currency));
  }

  multiply(factor: number): Result<Money, DomainError> {
    if (!Number.isInteger(factor) || factor < 0) {
      return err(
        DomainError.validation(
          'Money can only be multiplied by a non-negative integer',
        ),
      );
    }

    return ok(new Money(this.cents * factor, this.currency));
  }

  equals(other: Money): boolean {
    return (
      this.cents === other.cents &&
      this.currency === other.currency
    );
  }

  toJSON(): {
    cents: number;
    currency: string;
    formatted: string;
  } {
    return {
      cents: this.cents,
      currency: this.currency,
      formatted: this.format(),
    };
  }

  format(): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: this.currency,
      maximumFractionDigits: 2,
    }).format(this.cents / 100);
  }
}