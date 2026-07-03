import { beforeEach, describe, expect, it } from 'vitest';
import { CartService } from '@application/cart/CartService';
import { ProductService } from '@application/product/ProductService';
import { InMemoryCartRepository } from '@infrastructure/persistence/InMemoryCartRepository';
import { InMemoryProductRepository } from '@infrastructure/persistence/InMemoryProductRepository';

describe('CartService', () => {
  let cartService: CartService;
  let productService: ProductService;

  beforeEach(() => {
    const products = new InMemoryProductRepository();
    productService = new ProductService(products);
    cartService = new CartService(new InMemoryCartRepository(), products);
  });

  async function seedProduct(stock = 10): Promise<string> {
    const created = await productService.createProduct({
      name: 'Mug',
      description: '',
      priceCents: 2800,
      stock,
    });
    if (!created.ok) throw new Error('setup failed');
    return created.value.id;
  }

  it('returns an empty cart before anything is added', async () => {
    const cart = await cartService.viewCart();
    expect(cart.items).toEqual([]);
    expect(cart.total.cents).toBe(0);
  });

  it('adds an item and computes totals', async () => {
    const id = await seedProduct();
    const result = await cartService.addItem({ productId: id, quantity: 2 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.itemCount).toBe(2);
      expect(result.value.total.formatted).toBe('₹56.00');
    }
  });

  it('rejects adding a product that does not exist', async () => {
    const result = await cartService.addItem({ productId: 'ghost', quantity: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('rejects invalid quantities before touching the repository', async () => {
    const id = await seedProduct();
    const result = await cartService.addItem({ productId: id, quantity: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION');
  });

  it('rejects adding more than the available stock', async () => {
    const id = await seedProduct(3);
    const result = await cartService.addItem({ productId: id, quantity: 4 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('BUSINESS_RULE');
  });

  it('updates a line quantity', async () => {
    const id = await seedProduct();
    await cartService.addItem({ productId: id, quantity: 1 });
    const result = await cartService.updateItemQuantity({ productId: id, quantity: 5 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.itemCount).toBe(5);
  });

  it('removes a line and reports missing lines', async () => {
    const id = await seedProduct();
    await cartService.addItem({ productId: id, quantity: 1 });

    const removed = await cartService.removeItem(id);
    expect(removed.ok).toBe(true);
    if (removed.ok) expect(removed.value.items).toEqual([]);

    const again = await cartService.removeItem(id);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error.code).toBe('NOT_FOUND');
  });

  it('keeps carts isolated by cart id', async () => {
    const id = await seedProduct();
    await cartService.addItem({ productId: id, quantity: 2 }, 'cart-a');
    const cartB = await cartService.viewCart('cart-b');
    expect(cartB.items).toEqual([]);
  });
});
