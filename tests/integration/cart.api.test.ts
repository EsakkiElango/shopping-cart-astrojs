import { beforeEach, describe, expect, it } from 'vitest';
import { resetContainer } from '@infrastructure/container';
import { POST as createProduct } from '../../src/pages/api/products/index';
import { GET as viewCart } from '../../src/pages/api/cart/index';
import { POST as addItem } from '../../src/pages/api/cart/items/index';
import { DELETE as removeItem, PATCH as updateItem } from '../../src/pages/api/cart/items/[productId]';
import { call } from './helpers';

async function seedProduct(stock = 10): Promise<string> {
  const res = await call(createProduct, {
    method: 'POST',
    body: { name: 'Cart Test Mug', description: '', priceCents: 2800, stock },
  });
  return res.body.id;
}

describe('Cart API', () => {
  beforeEach(() => resetContainer());

  it('GET /api/cart returns an empty cart initially', async () => {
    const res = await call(viewCart);
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.total.cents).toBe(0);
  });

  it('POST /api/cart/items adds an item and returns 201 with the updated cart', async () => {
    const productId = await seedProduct();
    const res = await call(addItem, { method: 'POST', body: { productId, quantity: 2 } });
    expect(res.status).toBe(201);
    expect(res.body.itemCount).toBe(2);
    expect(res.body.items[0].subtotal.cents).toBe(5600);

    const cart = await call(viewCart);
    expect(cart.body.itemCount).toBe(2);
  });

  it('POST /api/cart/items merges duplicate lines', async () => {
    const productId = await seedProduct();
    await call(addItem, { method: 'POST', body: { productId, quantity: 2 } });
    const res = await call(addItem, { method: 'POST', body: { productId, quantity: 3 } });
    expect(res.body.items).toHaveLength(1);
    expect(res.body.itemCount).toBe(5);
  });

  it('POST /api/cart/items returns 404 for an unknown product', async () => {
    const res = await call(addItem, { method: 'POST', body: { productId: 'ghost', quantity: 1 } });
    expect(res.status).toBe(404);
  });

  it('POST /api/cart/items returns 400 for invalid quantity', async () => {
    const productId = await seedProduct();
    const res = await call(addItem, { method: 'POST', body: { productId, quantity: 0 } });
    expect(res.status).toBe(400);
  });

  it('POST /api/cart/items returns 422 when stock is insufficient', async () => {
    const productId = await seedProduct(2);
    const res = await call(addItem, { method: 'POST', body: { productId, quantity: 3 } });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('BUSINESS_RULE');
  });

  it('PATCH /api/cart/items/:productId sets the line quantity', async () => {
    const productId = await seedProduct();
    await call(addItem, { method: 'POST', body: { productId, quantity: 1 } });
    const res = await call(updateItem, { method: 'PATCH', params: { productId }, body: { quantity: 7 } });
    expect(res.status).toBe(200);
    expect(res.body.itemCount).toBe(7);
  });

  it('PATCH /api/cart/items/:productId returns 404 for a line not in the cart', async () => {
    const productId = await seedProduct();
    const res = await call(updateItem, { method: 'PATCH', params: { productId }, body: { quantity: 1 } });
    expect(res.status).toBe(404);
  });

  it('PATCH /api/cart/items/:productId returns 400 without a quantity', async () => {
    const productId = await seedProduct();
    await call(addItem, { method: 'POST', body: { productId, quantity: 1 } });
    const res = await call(updateItem, { method: 'PATCH', params: { productId }, body: {} });
    expect(res.status).toBe(400);
  });

  it('DELETE /api/cart/items/:productId removes the line, then 404s', async () => {
    const productId = await seedProduct();
    await call(addItem, { method: 'POST', body: { productId, quantity: 1 } });

    const removed = await call(removeItem, { method: 'DELETE', params: { productId } });
    expect(removed.status).toBe(200);
    expect(removed.body.items).toEqual([]);

    const again = await call(removeItem, { method: 'DELETE', params: { productId } });
    expect(again.status).toBe(404);
  });
});
