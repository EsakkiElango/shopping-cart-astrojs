import { describe, expect, it } from 'vitest';
import { Money } from '@domain/shared/Money';

describe('Money', () => {
  it('creates money from a non-negative integer amount of cents', () => {
    const money = Money.fromCents(1250);
    expect(money.ok).toBe(true);
    if (money.ok) {
      expect(money.value.cents).toBe(1250);
      expect(money.value.currency).toBe('INR');
    }
  });

  it('rejects fractional cents', () => {
    const money = Money.fromCents(12.5);
    expect(money.ok).toBe(false);
    if (!money.ok) expect(money.error.code).toBe('VALIDATION');
  });

  it('rejects negative amounts', () => {
    expect(Money.fromCents(-1).ok).toBe(false);
  });

  it('rejects malformed currency codes', () => {
    expect(Money.fromCents(100, 'usd').ok).toBe(false);
    expect(Money.fromCents(100, 'DOLLARS').ok).toBe(false);
  });

  it('adds amounts of the same currency', () => {
    const a = Money.fromCents(100);
    const b = Money.fromCents(250);
    if (!a.ok || !b.ok) throw new Error('setup failed');
    const sum = a.value.add(b.value);
    expect(sum.ok && sum.value.cents === 350).toBe(true);
  });

  it('refuses to add different currencies', () => {
    const usd = Money.fromCents(100, 'USD');
    const eur = Money.fromCents(100, 'EUR');
    if (!usd.ok || !eur.ok) throw new Error('setup failed');
    const sum = usd.value.add(eur.value);
    expect(sum.ok).toBe(false);
    if (!sum.ok) expect(sum.error.code).toBe('BUSINESS_RULE');
  });

  it('multiplies by a non-negative integer only', () => {
    const money = Money.fromCents(199);
    if (!money.ok) throw new Error('setup failed');
    const tripled = money.value.multiply(3);
    expect(tripled.ok && tripled.value.cents === 597).toBe(true);
    expect(money.value.multiply(1.5).ok).toBe(false);
    expect(money.value.multiply(-2).ok).toBe(false);
  });

  it('formats as a currency string', () => {
    const money = Money.fromCents(6400);
    if (!money.ok) throw new Error('setup failed');
    expect(money.value.format()).toBe('₹64.00');
  });

  it('compares by value', () => {
    const a = Money.fromCents(500);
    const b = Money.fromCents(500);
    if (!a.ok || !b.ok) throw new Error('setup failed');
    expect(a.value.equals(b.value)).toBe(true);
  });
});
