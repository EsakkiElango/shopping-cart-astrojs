import { describe, expect, it } from 'vitest';
import { Quantity } from '@domain/shared/Quantity';

describe('Quantity', () => {
  it('accepts whole numbers from 1 to the maximum', () => {
    expect(Quantity.create(1).ok).toBe(true);
    expect(Quantity.create(Quantity.MAX).ok).toBe(true);
  });

  it.each([
    [0, 'zero'],
    [-3, 'negative'],
    [2.5, 'fractional'],
    [Quantity.MAX + 1, 'above the maximum'],
  ])('rejects %s (%s)', (value) => {
    const quantity = Quantity.create(value);
    expect(quantity.ok).toBe(false);
    if (!quantity.ok) expect(quantity.error.code).toBe('VALIDATION');
  });

  it('adds quantities while enforcing the maximum', () => {
    const a = Quantity.create(2);
    const b = Quantity.create(3);
    if (!a.ok || !b.ok) throw new Error('setup failed');
    const sum = a.value.add(b.value);
    expect(sum.ok && sum.value.value === 5).toBe(true);

    const big = Quantity.create(Quantity.MAX);
    if (!big.ok) throw new Error('setup failed');
    expect(big.value.add(a.value).ok).toBe(false);
  });
});
