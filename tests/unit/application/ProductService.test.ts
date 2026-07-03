import { beforeEach, describe, expect, it } from 'vitest';
import { ProductService } from '@application/product/ProductService';
import { InMemoryProductRepository } from '@infrastructure/persistence/InMemoryProductRepository';

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(() => {
    service = new ProductService(new InMemoryProductRepository());
  });

  const valid = { name: 'Mug', description: 'Stoneware', priceCents: 2800, stock: 10 };

  it('creates and fetches a product', async () => {
    const created = await service.createProduct(valid);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const fetched = await service.getProduct(created.value.id);
    expect(fetched.ok).toBe(true);
    if (fetched.ok) {
      expect(fetched.value.name).toBe('Mug');
      expect(fetched.value.price.formatted).toBe('₹28.00');
    }
  });

  it('propagates validation errors from the domain', async () => {
    const created = await service.createProduct({ ...valid, priceCents: -5 });
    expect(created.ok).toBe(false);
    if (!created.ok) expect(created.error.code).toBe('VALIDATION');
  });

  it('lists all products', async () => {
    await service.createProduct(valid);
    await service.createProduct({ ...valid, name: 'Kettle' });
    const list = await service.listProducts();
    expect(list.map((p) => p.name).sort()).toEqual(['Kettle', 'Mug']);
  });

  it('updates a product partially', async () => {
    const created = await service.createProduct(valid);
    if (!created.ok) throw new Error('setup failed');

    const updated = await service.updateProduct(created.value.id, { priceCents: 3000 });
    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.value.price.cents).toBe(3000);
      expect(updated.value.name).toBe('Mug');
    }
  });

  it('returns NOT_FOUND when updating a missing product', async () => {
    const updated = await service.updateProduct('missing', { name: 'X' });
    expect(updated.ok).toBe(false);
    if (!updated.ok) expect(updated.error.code).toBe('NOT_FOUND');
  });

  it('deletes a product exactly once', async () => {
    const created = await service.createProduct(valid);
    if (!created.ok) throw new Error('setup failed');

    expect((await service.deleteProduct(created.value.id)).ok).toBe(true);
    const again = await service.deleteProduct(created.value.id);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error.code).toBe('NOT_FOUND');
  });
});
