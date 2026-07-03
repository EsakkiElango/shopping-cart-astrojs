import { DomainError } from './DomainError';
import { err, ok, type Result } from './Result';

export class Quantity {
  static readonly MAX = 999;

  private constructor(public readonly value: number) {}

  static create(value: number): Result<Quantity, DomainError> {
    if (!Number.isInteger(value)) {
      return err(DomainError.validation('Quantity must be a whole number', { quantity: String(value) }));
    }
    if (value < 1) {
      return err(DomainError.validation('Quantity must be at least 1', { quantity: String(value) }));
    }
    if (value > Quantity.MAX) {
      return err(DomainError.validation(`Quantity cannot exceed ${Quantity.MAX}`, { quantity: String(value) }));
    }
    return ok(new Quantity(value));
  }

  add(other: Quantity): Result<Quantity, DomainError> {
    return Quantity.create(this.value + other.value);
  }

  equals(other: Quantity): boolean {
    return this.value === other.value;
  }
}
