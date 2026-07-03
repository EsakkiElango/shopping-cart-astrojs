import { Cart, type CartRepository } from '@domain/cart/Cart';
import { ProductId, type ProductRepository } from '@domain/product/Product';
import { DomainError } from '@domain/shared/DomainError';
import { Quantity } from '@domain/shared/Quantity';
import { err, ok, type Result } from '@domain/shared/Result';

export interface CartItemDTO {
  productId: string;
  productName: string;
  unitPrice: { cents: number; currency: string; formatted: string };
  quantity: number;
  subtotal: { cents: number; currency: string; formatted: string };
}

export interface CartDTO {
  id: string;
  items: CartItemDTO[];
  itemCount: number;
  total: { cents: number; currency: string; formatted: string };
}

export function toCartDTO(cart: Cart): CartDTO {
  return {
    id: cart.id,
    items: cart.getItems().map((item) => ({
      productId: item.productId.value,
      productName: item.productName,
      unitPrice: item.unitPrice.toJSON(),
      quantity: item.quantity.value,
      subtotal: item.subtotal().toJSON(),
    })),
    itemCount: cart.itemCount(),
    total: cart.total().toJSON(),
  };
}

export class CartService {
  static readonly DEFAULT_CART_ID = 'default';

  constructor(
    private readonly carts: CartRepository,
    private readonly products: ProductRepository,
  ) {}

  async viewCart(cartId = CartService.DEFAULT_CART_ID): Promise<CartDTO> {
    const cart = await this.getOrCreateCart(cartId);
    return toCartDTO(cart);
  }

  async addItem(
    input: { productId: string; quantity: number },
    cartId = CartService.DEFAULT_CART_ID,
  ): Promise<Result<CartDTO, DomainError>> {
    const parsed = await this.resolve(input.productId, input.quantity);
    if (!parsed.ok) return parsed;
    const { product, quantity } = parsed.value;

    const cart = await this.getOrCreateCart(cartId);
    const added = cart.addItem(product, quantity);
    if (!added.ok) return added;

    await this.carts.save(cart);
    return ok(toCartDTO(cart));
  }

  async updateItemQuantity(
    input: { productId: string; quantity: number },
    cartId = CartService.DEFAULT_CART_ID,
  ): Promise<Result<CartDTO, DomainError>> {
    const parsed = await this.resolve(input.productId, input.quantity);
    if (!parsed.ok) return parsed;
    const { product, quantity } = parsed.value;

    const cart = await this.getOrCreateCart(cartId);
    const updated = cart.updateItemQuantity(product, quantity);
    if (!updated.ok) return updated;

    await this.carts.save(cart);
    return ok(toCartDTO(cart));
  }

  async removeItem(
    productId: string,
    cartId = CartService.DEFAULT_CART_ID,
  ): Promise<Result<CartDTO, DomainError>> {
    const id = ProductId.create(productId);
    if (!id.ok) return id;

    const cart = await this.getOrCreateCart(cartId);
    const removed = cart.removeItem(id.value);
    if (!removed.ok) return removed;

    await this.carts.save(cart);
    return ok(toCartDTO(cart));
  }

  private async resolve(productId: string, quantity: number) {
    const id = ProductId.create(productId);
    if (!id.ok) return id;

    const qty = Quantity.create(quantity);
    if (!qty.ok) return qty;

    const product = await this.products.findById(id.value);
    if (!product) {
      return err(DomainError.notFound(`Product ${productId} not found`));
    }
    return ok({ product, quantity: qty.value });
  }

  private async getOrCreateCart(cartId: string): Promise<Cart> {
    const existing = await this.carts.findById(cartId);
    if (existing) return existing;

    const cart = Cart.create(cartId);
    await this.carts.save(cart);
    return cart;
  }
}
