import { Product, ProductId, type ProductRepository } from '@domain/product/Product';
import { DomainError } from '@domain/shared/DomainError';
import { Money } from '@domain/shared/Money';
import { err, ok, type Result } from '@domain/shared/Result';

export interface ProductDTO {
  id: string;
  name: string;
  description: string;
  price: { cents: number; currency: string; formatted: string };
  stock: number;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  priceCents: number;
  currency?: string;
  stock: number;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  priceCents?: number;
  currency?: string;
  stock?: number;
}

export function toProductDTO(product: Product): ProductDTO {
  return {
    id: product.id.value,
    name: product.name,
    description: product.description,
    price: product.price.toJSON(),
    stock: product.stock,
  };
}

export class ProductService {
  constructor(private readonly products: ProductRepository) {}

  async createProduct(input: CreateProductInput): Promise<Result<ProductDTO, DomainError>> {
    const price = Money.fromCents(input.priceCents, input.currency ?? 'INR');
    if (!price.ok) return price;

    const product = Product.create({
      name: input.name,
      description: input.description ?? '',
      price: price.value,
      stock: input.stock,
    });
    if (!product.ok) return product;

    await this.products.save(product.value);
    return ok(toProductDTO(product.value));
  }

  async getProduct(id: string): Promise<Result<ProductDTO, DomainError>> {
    const found = await this.findProduct(id);
    if (!found.ok) return found;
    return ok(toProductDTO(found.value));
  }

  async listProducts(): Promise<ProductDTO[]> {
    const all = await this.products.findAll();
    return all.map(toProductDTO);
  }

  async updateProduct(id: string, input: UpdateProductInput): Promise<Result<ProductDTO, DomainError>> {
    const found = await this.findProduct(id);
    if (!found.ok) return found;
    const product = found.value;

    let price: Money | undefined;
    if (input.priceCents !== undefined || input.currency !== undefined) {
      if (input.priceCents === undefined) {
        return err(DomainError.validation('priceCents is required when changing currency'));
      }
      const parsed = Money.fromCents(input.priceCents, input.currency ?? product.price.currency);
      if (!parsed.ok) return parsed;
      price = parsed.value;
    }

    const updated = product.update({
      name: input.name,
      description: input.description,
      stock: input.stock,
      price,
    });
    if (!updated.ok) return updated;

    await this.products.save(product);
    return ok(toProductDTO(product));
  }

  async deleteProduct(id: string): Promise<Result<void, DomainError>> {
    const productId = ProductId.create(id);
    if (!productId.ok) return productId;

    const deleted = await this.products.delete(productId.value);
    if (!deleted) {
      return err(DomainError.notFound(`Product ${id} not found`));
    }
    return ok(undefined);
  }

  private async findProduct(id: string): Promise<Result<Product, DomainError>> {
    const productId = ProductId.create(id);
    if (!productId.ok) return productId;

    const product = await this.products.findById(productId.value);
    if (!product) {
      return err(DomainError.notFound(`Product ${id} not found`));
    }
    return ok(product);
  }
}
