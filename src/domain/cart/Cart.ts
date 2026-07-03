import type { Product, ProductId } from '../product/Product';
import { DomainError } from '../shared/DomainError';
import { Money } from '../shared/Money';
import { Quantity } from '../shared/Quantity';
import { err, ok, type Result } from '../shared/Result';

export class CartItem {
  constructor(
    public readonly productId: ProductId,
    public readonly productName: string,
    public readonly unitPrice: Money,
    public readonly quantity: Quantity,
  ) {}

  withQuantity(quantity: Quantity): CartItem {
    return new CartItem(this.productId, this.productName, this.unitPrice, quantity);
  }

  subtotal(): Money {
    // Multiplying by a bounded positive integer cannot fail; fall back to zero defensively.
    const result = this.unitPrice.multiply(this.quantity.value);
    return result.ok ? result.value : Money.zero(this.unitPrice.currency);
  }
}

export class Cart {
  private constructor(
    public readonly id: string,
    private readonly items: Map<string, CartItem>,
  ) {}

  static create(id: string): Cart {
    return new Cart(id, new Map());
  }

  addItem(product: Product, quantity: Quantity): Result<void, DomainError> {
    const existing = this.items.get(product.id.value);
    const desired = existing ? existing.quantity.add(quantity) : ok(quantity);
    if (!desired.ok) return desired;

    if (!product.hasStockFor(desired.value.value)) {
      return err(
        DomainError.businessRule(
          `Only ${product.stock} unit(s) of "${product.name}" in stock; cart would hold ${desired.value.value}`,
        ),
      );
    }

    this.items.set(
      product.id.value,
      new CartItem(product.id, product.name, product.price, desired.value),
    );
    return ok(undefined);
  }

  updateItemQuantity(product: Product, quantity: Quantity): Result<void, DomainError> {
    const existing = this.items.get(product.id.value);
    if (!existing) {
      return err(DomainError.notFound(`Product ${product.id.value} is not in the cart`));
    }
    if (!product.hasStockFor(quantity.value)) {
      return err(
        DomainError.businessRule(
          `Only ${product.stock} unit(s) of "${product.name}" in stock; requested ${quantity.value}`,
        ),
      );
    }
    this.items.set(product.id.value, existing.withQuantity(quantity));
    return ok(undefined);
  }

  removeItem(productId: ProductId): Result<void, DomainError> {
    if (!this.items.delete(productId.value)) {
      return err(DomainError.notFound(`Product ${productId.value} is not in the cart`));
    }
    return ok(undefined);
  }

  clear(): void {
    this.items.clear();
  }

  getItems(): CartItem[] {
    return [...this.items.values()];
  }

  itemCount(): number {
    return this.getItems().reduce((sum, item) => sum + item.quantity.value, 0);
  }

  total(): Money {
    let total = Money.zero();
    for (const item of this.items.values()) {
      const sum = total.add(item.subtotal());
      if (sum.ok) total = sum.value;
    }
    return total;
  }

  isEmpty(): boolean {
    return this.items.size === 0;
  }
}

export interface CartRepository {
  findById(id: string): Promise<Cart | null>;
  save(cart: Cart): Promise<void>;
}
