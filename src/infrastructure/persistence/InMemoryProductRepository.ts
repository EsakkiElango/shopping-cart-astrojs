import type { Product, ProductId, ProductRepository } from '@domain/product/Product';

export class InMemoryProductRepository implements ProductRepository {
  private readonly store = new Map<string, Product>();

  async findById(id: ProductId): Promise<Product | null> {
    return this.store.get(id.value) ?? null;
  }

  async findAll(): Promise<Product[]> {
    return [...this.store.values()];
  }

  async save(product: Product): Promise<void> {
    this.store.set(product.id.value, product);
  }

  async delete(id: ProductId): Promise<boolean> {
    return this.store.delete(id.value);
  }
}
