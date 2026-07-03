import { beforeEach, describe, expect, it } from 'vitest';
import { resetContainer } from '@infrastructure/container';
import { GET as listProducts, POST as createProduct } from '../../src/pages/api/products/index';
import { DELETE as deleteProduct, GET as getProduct, PUT as updateProduct } from '../../src/pages/api/products/[id]';
import { call } from './helpers';

const validProduct = { name: 'Test Kettle', description: 'A kettle', priceCents: 6400, stock: 5 };

describe('Products API', () => {
  beforeEach(() => resetContainer());

  it('GET /api/products returns the seeded catalog', async () => {
    const res = await call(listProducts);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('id');
    expect(res.body[0]).toHaveProperty('price.formatted');
  });

  it('POST /api/products creates a product and returns 201', async () => {
    const res = await call(createProduct, { method: 'POST', body: validProduct });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Kettle');
    expect(res.body.price.cents).toBe(6400);

    const fetched = await call(getProduct, { params: { id: res.body.id } });
    expect(fetched.status).toBe(200);
    expect(fetched.body.name).toBe('Test Kettle');
  });

  it('POST /api/products rejects a missing required field with 400', async () => {
    const { name, ...withoutName } = validProduct;
    const res = await call(createProduct, { method: 'POST', body: withoutName });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION');
    expect(res.body.error.message).toContain('name');
  });

  it('POST /api/products rejects wrong field types with 400', async () => {
    const res = await call(createProduct, { method: 'POST', body: { ...validProduct, priceCents: '6400' } });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('priceCents');
  });

  it('POST /api/products rejects malformed JSON with 400', async () => {
    const res = await call(createProduct, { method: 'POST', rawBody: '{not json' });
    expect(res.status).toBe(400);
  });

  it('POST /api/products rejects domain rule violations with 400', async () => {
    const res = await call(createProduct, { method: 'POST', body: { ...validProduct, priceCents: 12.5 } });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION');
  });

  it('GET /api/products/:id returns 404 for an unknown product', async () => {
    const res = await call(getProduct, { params: { id: 'does-not-exist' } });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('PUT /api/products/:id applies a partial update', async () => {
    const created = await call(createProduct, { method: 'POST', body: validProduct });
    const res = await call(updateProduct, {
      method: 'PUT',
      params: { id: created.body.id },
      body: { stock: 42 },
    });
    expect(res.status).toBe(200);
    expect(res.body.stock).toBe(42);
    expect(res.body.name).toBe('Test Kettle');
  });

  it('PUT /api/products/:id rejects invalid updates with 400', async () => {
    const created = await call(createProduct, { method: 'POST', body: validProduct });
    const res = await call(updateProduct, {
      method: 'PUT',
      params: { id: created.body.id },
      body: { stock: -1 },
    });
    expect(res.status).toBe(400);
  });

  it('PUT /api/products/:id returns 404 for an unknown product', async () => {
    const res = await call(updateProduct, { method: 'PUT', params: { id: 'nope' }, body: { name: 'X' } });
    expect(res.status).toBe(404);
  });

  it('DELETE /api/products/:id deletes once, then 404s', async () => {
    const created = await call(createProduct, { method: 'POST', body: validProduct });
    const first = await call(deleteProduct, { method: 'DELETE', params: { id: created.body.id } });
    expect(first.status).toBe(200);
    expect(first.body.deleted).toBe(true);

    const second = await call(deleteProduct, { method: 'DELETE', params: { id: created.body.id } });
    expect(second.status).toBe(404);
  });
});
