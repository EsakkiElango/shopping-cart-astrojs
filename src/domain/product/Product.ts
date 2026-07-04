import { DomainError } from '../shared/DomainError';
import { Money } from '../shared/Money';
import { err, ok, type Result } from '../shared/Result';

export class ProductId {
  private constructor(public readonly value: string) {}

  static create(value: string): Result<ProductId, DomainError> {
    if (typeof value !== 'string' || value.trim().length === 0) {
      return err(DomainError.validation('Product id cannot be empty'));
    }
    return ok(new ProductId(value.trim()));
  }

  static generate(): ProductId {
    return new ProductId(crypto.randomUUID());
  }

  equals(other: ProductId): boolean {
    return this.value === other.value;
  }
}

interface ProductProps {
  id: ProductId;
  name: string;
  description: string;
  price: Money;
  stock: number;
}

export interface ProductPatch {
  name?: string;
  description?: string;
  price?: Money;
  stock?: number;
}

export class Product {
  static readonly NAME_MAX = 120;
  static readonly DESCRIPTION_MAX = 2000;
  static readonly STOCK_MAX = 100_000;

  private constructor(private props: ProductProps) {}

  static create(input: {
    name: string;
    description: string;
    price: Money;
    stock: number;
    id?: ProductId;
  }): Result<Product, DomainError> {
    const name = Product.validateName(input.name);
    if (!name.ok) return name;

    const description = Product.validateDescription(input.description);
    if (!description.ok) return description;

    const stock = Product.validateStock(input.stock);
    if (!stock.ok) return stock;

    return ok(
      new Product({
        id: input.id ?? ProductId.generate(),
        name: name.value,
        description: description.value,
        price: input.price,
        stock: stock.value,
      }),
    );
  }

  update(patch: ProductPatch): Result<void, DomainError> {
    const next: ProductProps = { ...this.props };

    if (patch.name !== undefined) {
      const name = Product.validateName(patch.name);
      if (!name.ok) return name;
      next.name = name.value;
    }
    if (patch.description !== undefined) {
      const description = Product.validateDescription(patch.description);
      if (!description.ok) return description;
      next.description = description.value;
    }
    if (patch.stock !== undefined) {
      const stock = Product.validateStock(patch.stock);
      if (!stock.ok) return stock;
      next.stock = patch.stock;
    }
    if (patch.price !== undefined) {
      next.price = patch.price;
    }

    this.props = next;
    return ok(undefined);
  }

  hasStockFor(requested: number): boolean {
    return this.props.stock >= requested;
  }

  deductStock(quantity: number): Result<void, DomainError> {
    if (!this.hasStockFor(quantity)) {
      return err(
        DomainError.businessRule(
          `Only ${this.props.stock} unit(s) of "${this.props.name}" in stock; cannot deduct ${quantity}`,
        ),
      );
    }
    this.props = { ...this.props, stock: this.props.stock - quantity };
    return ok(undefined);
  }

  get id(): ProductId {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get description(): string {
    return this.props.description;
  }
  get price(): Money {
    return this.props.price;
  }
  get stock(): number {
    return this.props.stock;
  }

  private static validateName(name: string): Result<string, DomainError> {
    const trimmed = name?.trim() ?? '';
    if (trimmed.length === 0) {
      return err(DomainError.validation('Product name is required', { field: 'name' }));
    }
    if (trimmed.length > Product.NAME_MAX) {
      return err(
        DomainError.validation(`Product name cannot exceed ${Product.NAME_MAX} characters`, { field: 'name' }),
      );
    }
    return ok(trimmed);
  }

  private static validateDescription(description: string): Result<string, DomainError> {
    const trimmed = description?.trim() ?? '';
    if (trimmed.length > Product.DESCRIPTION_MAX) {
      return err(
        DomainError.validation(`Description cannot exceed ${Product.DESCRIPTION_MAX} characters`, {
          field: 'description',
        }),
      );
    }
    return ok(trimmed);
  }

  private static validateStock(stock: number): Result<number, DomainError> {
    if (!Number.isInteger(stock) || stock < 0 || stock > Product.STOCK_MAX) {
      return err(
        DomainError.validation(`Stock must be a whole number between 0 and ${Product.STOCK_MAX}`, {
          field: 'stock',
        }),
      );
    }
    return ok(stock);
  }
}

export interface ProductRepository {
  findById(id: ProductId): Promise<Product | null>;
  findAll(): Promise<Product[]>;
  save(product: Product): Promise<void>;
  delete(id: ProductId): Promise<boolean>;
}
