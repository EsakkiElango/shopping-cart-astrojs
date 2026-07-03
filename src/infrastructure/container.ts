import { CartService } from '@application/cart/CartService';
import { ProductService } from '@application/product/ProductService';
import { InMemoryCartRepository } from './persistence/InMemoryCartRepository';
import { InMemoryProductRepository } from './persistence/InMemoryProductRepository';

export interface AppContainer {
  productService: ProductService;
  cartService: CartService;
}

export function createContainer(): AppContainer {
  const productRepository = new InMemoryProductRepository();
  const cartRepository = new InMemoryCartRepository();
  return {
    productService: new ProductService(productRepository),
    cartService: new CartService(cartRepository, productRepository),
  };
}

const SEED_PRODUCTS = [
  { name: 'Ceramic Pour-Over Kettle', description: 'Gooseneck kettle with a matte glaze, 900 ml.', priceCents: 6400, stock: 12 },
  { name: 'Single-Origin Espresso Beans', description: 'Yirgacheffe, washed process, 250 g bag.', priceCents: 1850, stock: 48 },
  { name: 'Walnut Serving Board', description: 'End-grain walnut, food-safe oil finish.', priceCents: 5200, stock: 7 },
  { name: 'Linen Apron', description: 'Stonewashed linen with brass hardware.', priceCents: 3900, stock: 15 },
  { name: 'Hand Thrown Mug', description: 'Speckled stoneware, 350 ml, dishwasher safe.', priceCents: 2800, stock: 30 },
  { name: 'Copper Measuring Spoons', description: 'Set of five, hand-polished.', priceCents: 2400, stock: 0 },
];

async function seed(container: AppContainer): Promise<void> {
  for (const product of SEED_PRODUCTS) {
    await container.productService.createProduct(product);
  }
}

let instance: AppContainer | null = null;

export function resetContainer(): void {
  instance = null;
}

export async function getContainer(): Promise<AppContainer> {
  if (!instance) {
    instance = createContainer();
    await seed(instance);
  }
  return instance;
}
