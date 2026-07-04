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
      expect(result.value.total.formatted).toBe('$56.00');
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

  describe('checkout', () => {
    it('rejects checking out an empty cart', async () => {
      const result = await cartService.checkout();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('BUSINESS_RULE');
    });

    it('deducts purchased quantities from stock and empties the cart', async () => {
      const id = await seedProduct(10);
      await cartService.addItem({ productId: id, quantity: 3 });

      const result = await cartService.checkout();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.itemCount).toBe(3);
        expect(result.value.orderId).toBeTruthy();
        expect(result.value.total.formatted).toBe('$84.00');
      }

      const product = await productService.getProduct(id);
      if (!product.ok) throw new Error('setup failed');
      expect(product.value.stock).toBe(7);

      const cart = await cartService.viewCart();
      expect(cart.items).toEqual([]);
    });

    it('deducts stock across multiple lines in a single checkout', async () => {
      const first = await seedProduct(5);
      const second = await seedProduct(5);
      await cartService.addItem({ productId: first, quantity: 2 });
      await cartService.addItem({ productId: second, quantity: 4 });

      const result = await cartService.checkout();
      expect(result.ok).toBe(true);

      const firstProduct = await productService.getProduct(first);
      const secondProduct = await productService.getProduct(second);
      if (!firstProduct.ok || !secondProduct.ok) throw new Error('setup failed');
      expect(firstProduct.value.stock).toBe(3);
      expect(secondProduct.value.stock).toBe(1);
    });

    it('fails without changing any stock if one line no longer has enough', async () => {
      const plentiful = await seedProduct(10);
      const scarce = await seedProduct(2);
      await cartService.addItem({ productId: plentiful, quantity: 3 });
      await cartService.addItem({ productId: scarce, quantity: 2 });

      // Someone else buys the scarce item first, dropping stock below the cart's quantity.
      await productService.updateProduct(scarce, { stock: 1 });

      const result = await cartService.checkout();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('BUSINESS_RULE');

      const plentifulProduct = await productService.getProduct(plentiful);
      if (!plentifulProduct.ok) throw new Error('setup failed');
      expect(plentifulProduct.value.stock).toBe(10);

      const cart = await cartService.viewCart();
      expect(cart.items).toHaveLength(2);
    });
  });
});
