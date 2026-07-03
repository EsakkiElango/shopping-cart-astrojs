import type { Cart, CartRepository } from '@domain/cart/Cart';

export class InMemoryCartRepository implements CartRepository {
  private readonly store = new Map<string, Cart>();

  async findById(id: string): Promise<Cart | null> {
    return this.store.get(id) ?? null;
  }

  async save(cart: Cart): Promise<void> {
    this.store.set(cart.id, cart);
  }
}
