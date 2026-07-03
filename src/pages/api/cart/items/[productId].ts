import type { APIRoute } from 'astro';
import { getContainer } from '@infrastructure/container';
import { badRequest, internalError, parseJsonBody, resultResponse } from '@presentation/http';

export const prerender = false;

/** PATCH /api/cart/items/:productId — set the quantity of a cart line. */
export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    if (!params.productId) return badRequest('Product id is required');
    const body = await parseJsonBody<{ quantity: number }>(request, {
      quantity: { type: 'number', required: true },
    });
    if (!body.ok) return body.response;

    const { cartService } = await getContainer();
    return resultResponse(
      await cartService.updateItemQuantity({ productId: params.productId, quantity: body.value.quantity }),
    );
  } catch {
    return internalError();
  }
};

/** DELETE /api/cart/items/:productId — remove a line from the cart. */
export const DELETE: APIRoute = async ({ params }) => {
  try {
    if (!params.productId) return badRequest('Product id is required');
    const { cartService } = await getContainer();
    return resultResponse(await cartService.removeItem(params.productId));
  } catch {
    return internalError();
  }
};
