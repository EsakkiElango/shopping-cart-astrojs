import { describe, expect, it } from 'vitest';
import { Product, ProductId } from '@domain/product/Product';
import { Money } from '@domain/shared/Money';

function price(cents: number): Money {
  const result = Money.fromCents(cents);
  if (!result.ok) throw new Error('setup failed');
  return result.value;
}

function makeProduct(overrides: Partial<{ name: string; description: string; stock: number }> = {}) {
  return Product.create({
    name: overrides.name ?? 'Hand Thrown Mug',
    description: overrides.description ?? 'Speckled stoneware',
    price: price(2800),
    stock: overrides.stock ?? 10,
  });
}

describe('Product', () => {
  it('creates a valid product with a generated id', () => {
    const product = makeProduct();
    expect(product.ok).toBe(true);
    if (product.ok) {
      expect(product.value.id.value).toBeTruthy();
      expect(product.value.name).toBe('Hand Thrown Mug');
    }
  });

  it('trims whitespace from the name', () => {
    const product = makeProduct({ name: '  Mug  ' });
    if (!product.ok) throw new Error('expected ok');
    expect(product.value.name).toBe('Mug');
  });

  it('rejects an empty name', () => {
    const product = makeProduct({ name: '   ' });
    expect(product.ok).toBe(false);
    if (!product.ok) expect(product.error.details?.field).toBe('name');
  });

  it('rejects a name over the maximum length', () => {
    expect(makeProduct({ name: 'x'.repeat(Product.NAME_MAX + 1) }).ok).toBe(false);
  });

  it('rejects an overly long description', () => {
    expect(makeProduct({ description: 'x'.repeat(Product.DESCRIPTION_MAX + 1) }).ok).toBe(false);
  });

  it.each([[-1], [1.5], [Product.STOCK_MAX + 1]])('rejects invalid stock %s', (stock) => {
    expect(makeProduct({ stock }).ok).toBe(false);
  });

  it('allows zero stock (out-of-stock catalog entries are valid)', () => {
    expect(makeProduct({ stock: 0 }).ok).toBe(true);
  });

  it('applies partial updates atomically', () => {
    const created = makeProduct();
    if (!created.ok) throw new Error('setup failed');
    const product = created.value;

    const updated = product.update({ name: 'Renamed Mug', stock: 3 });
    expect(updated.ok).toBe(true);
    expect(product.name).toBe('Renamed Mug');
    expect(product.stock).toBe(3);
    expect(product.description).toBe('Speckled stoneware');
  });

  it('rejects an invalid update without mutating any field', () => {
    const created = makeProduct();
    if (!created.ok) throw new Error('setup failed');
    const product = created.value;

    const updated = product.update({ name: 'New Name', stock: -5 });
    expect(updated.ok).toBe(false);
    expect(product.name).toBe('Hand Thrown Mug');
    expect(product.stock).toBe(10);
  });

  it('reports stock availability', () => {
    const created = makeProduct({ stock: 4 });
    if (!created.ok) throw new Error('setup failed');
    expect(created.value.hasStockFor(4)).toBe(true);
    expect(created.value.hasStockFor(5)).toBe(false);
  });

  it('deducts stock when enough is available', () => {
    const created = makeProduct({ stock: 10 });
    if (!created.ok) throw new Error('setup failed');
    const result = created.value.deductStock(3);
    expect(result.ok).toBe(true);
    expect(created.value.stock).toBe(7);
  });

  it('rejects deducting more stock than is available, leaving stock unchanged', () => {
    const created = makeProduct({ stock: 2 });
    if (!created.ok) throw new Error('setup failed');
    const result = created.value.deductStock(3);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('BUSINESS_RULE');
    expect(created.value.stock).toBe(2);
  });
});

describe('ProductId', () => {
  it('rejects blank ids', () => {
    expect(ProductId.create('').ok).toBe(false);
    expect(ProductId.create('   ').ok).toBe(false);
  });

  it('compares by value', () => {
    const a = ProductId.create('p-1');
    const b = ProductId.create('p-1');
    if (!a.ok || !b.ok) throw new Error('setup failed');
    expect(a.value.equals(b.value)).toBe(true);
  });
});
