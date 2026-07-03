import type { APIRoute } from 'astro';
import { getContainer } from '@infrastructure/container';
import { internalError, jsonResponse } from '@presentation/http';

export const prerender = false;

/** GET /api/cart — view the cart with line items and totals. */
export const GET: APIRoute = async () => {
  try {
    const { cartService } = await getContainer();
    return jsonResponse(await cartService.viewCart());
  } catch {
    return internalError();
  }
};
