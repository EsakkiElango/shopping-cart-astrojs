import type { APIRoute } from 'astro';
import type { CreateProductInput } from '@application/product/ProductService';
import { getContainer } from '@infrastructure/container';
import { internalError, jsonResponse, parseJsonBody, resultResponse } from '@presentation/http';

export const prerender = false;

/** GET /api/products — list all products. */
export const GET: APIRoute = async () => {
  try {
    const { productService } = await getContainer();
    return jsonResponse(await productService.listProducts());
  } catch {
    return internalError();
  }
};

/** POST /api/products — add a new product. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await parseJsonBody<CreateProductInput>(request, {
      name: { type: 'string', required: true },
      description: { type: 'string', required: false },
      priceCents: { type: 'number', required: true },
      currency: { type: 'string', required: false },
      stock: { type: 'number', required: true },
    });
    if (!body.ok) return body.response;

    const { productService } = await getContainer();
    return resultResponse(await productService.createProduct(body.value), 201);
  } catch {
    return internalError();
  }
};
