import type { APIRoute } from 'astro';
import { getContainer } from '@infrastructure/container';
import { internalError, resultResponse } from '@presentation/http';

export const prerender = false;

/**
 * POST /api/cart/checkout — completes the sale. Deducts purchased quantities
 * from product stock and empties the cart. Fails without side effects if any
 * line no longer has enough stock.
 */
export const POST: APIRoute = async () => {
  try {
    const { cartService } = await getContainer();
    return resultResponse(await cartService.checkout());
  } catch {
    return internalError();
  }
};
