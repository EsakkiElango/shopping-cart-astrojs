import type { APIRoute } from 'astro';
import { getContainer } from '@infrastructure/container';
import { internalError, parseJsonBody, resultResponse } from '@presentation/http';

export const prerender = false;

/** POST /api/cart/items — add a product to the cart. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await parseJsonBody<{ productId: string; quantity: number }>(request, {
      productId: { type: 'string', required: true },
      quantity: { type: 'number', required: true },
    });
    if (!body.ok) return body.response;

    const { cartService } = await getContainer();
    return resultResponse(await cartService.addItem(body.value), 201);
  } catch {
    return internalError();
  }
};
