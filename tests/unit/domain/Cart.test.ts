import { describe, expect, it } from 'vitest';
import { Cart } from '@domain/cart/Cart';
import { Product } from '@domain/product/Product';
import { Money } from '@domain/shared/Money';
import { Quantity } from '@domain/shared/Quantity';

function product(name: string, priceCents: number, stock: number): Product {
  const price = Money.fromCents(priceCents);
  if (!price.ok) throw new Error('setup failed');
  const created = Product.create({ name, description: '', price: price.value, stock });
  if (!created.ok) throw new Error('setup failed');
  return created.value;
}

function qty(value: number): Quantity {
  const created = Quantity.create(value);
  if (!created.ok) throw new Error('setup failed');
  return created.value;
}

describe('Cart', () => {
  it('starts empty with a zero total', () => {
    const cart = Cart.create('c-1');
    expect(cart.isEmpty()).toBe(true);
    expect(cart.itemCount()).toBe(0);
    expect(cart.total().cents).toBe(0);
  });

  it('adds an item and derives the subtotal', () => {
    const cart = Cart.create('c-1');
    const mug = product('Mug', 2800, 10);

    const added = cart.addItem(mug, qty(2));
    expect(added.ok).toBe(true);
    expect(cart.itemCount()).toBe(2);
    expect(cart.total().cents).toBe(5600);
  });

  it('merges quantities when the same product is added twice', () => {
    const cart = Cart.create('c-1');
    const mug = product('Mug', 2800, 10);

    cart.addItem(mug, qty(2));
    cart.addItem(mug, qty(3));

    expect(cart.getItems()).toHaveLength(1);
    expect(cart.itemCount()).toBe(5);
  });

  it('refuses to add beyond available stock, including across merges', () => {
    const cart = Cart.create('c-1');
    const board = product('Board', 5200, 3);

    expect(cart.addItem(board, qty(2)).ok).toBe(true);
    const second = cart.addItem(board, qty(2));
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe('BUSINESS_RULE');
    expect(cart.itemCount()).toBe(2);
  });

  it('refuses to add an out-of-stock product', () => {
    const cart = Cart.create('c-1');
    const spoons = product('Spoons', 2400, 0);
    expect(cart.addItem(spoons, qty(1)).ok).toBe(false);
  });

  it('updates the quantity of an existing line', () => {
    const cart = Cart.create('c-1');
    const mug = product('Mug', 2800, 10);
    cart.addItem(mug, qty(2));

    const updated = cart.updateItemQuantity(mug, qty(7));
    expect(updated.ok).toBe(true);
    expect(cart.itemCount()).toBe(7);
    expect(cart.total().cents).toBe(7 * 2800);
  });

  it('rejects a quantity update above stock', () => {
    const cart = Cart.create('c-1');
    const mug = product('Mug', 2800, 5);
    cart.addItem(mug, qty(2));
    expect(cart.updateItemQuantity(mug, qty(6)).ok).toBe(false);
    expect(cart.itemCount()).toBe(2);
  });

  it('rejects updating a line that is not in the cart', () => {
    const cart = Cart.create('c-1');
    const mug = product('Mug', 2800, 5);
    const result = cart.updateItemQuantity(mug, qty(1));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('removes items and reports missing lines', () => {
    const cart = Cart.create('c-1');
    const mug = product('Mug', 2800, 5);
    cart.addItem(mug, qty(1));

    expect(cart.removeItem(mug.id).ok).toBe(true);
    expect(cart.isEmpty()).toBe(true);

    const again = cart.removeItem(mug.id);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error.code).toBe('NOT_FOUND');
  });

  it('totals across multiple lines', () => {
    const cart = Cart.create('c-1');
    cart.addItem(product('Mug', 2800, 5), qty(2));
    cart.addItem(product('Kettle', 6400, 5), qty(1));
    expect(cart.total().cents).toBe(2 * 2800 + 6400);
  });

  it('keeps the price snapshot from when the item was added', () => {
    const cart = Cart.create('c-1');
    const mug = product('Mug', 2800, 10);
    cart.addItem(mug, qty(1));

    mug.update({ price: (() => { const p = Money.fromCents(9999); if (!p.ok) throw new Error(); return p.value; })() });
    expect(cart.total().cents).toBe(2800);
  });
});
