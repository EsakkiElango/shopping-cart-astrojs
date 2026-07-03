import type { APIRoute } from 'astro';
import type { UpdateProductInput } from '@application/product/ProductService';
import { getContainer } from '@infrastructure/container';
import { badRequest, internalError, jsonResponse, parseJsonBody, resultResponse } from '@presentation/http';

export const prerender = false;

/** GET /api/products/:id — fetch product details. */
export const GET: APIRoute = async ({ params }) => {
  try {
    if (!params.id) return badRequest('Product id is required');
    const { productService } = await getContainer();
    return resultResponse(await productService.getProduct(params.id));
  } catch {
    return internalError();
  }
};

/** PUT /api/products/:id — update product details (partial updates allowed). */
export const PUT: APIRoute = async ({ params, request }) => {
  try {
    if (!params.id) return badRequest('Product id is required');
    const body = await parseJsonBody<UpdateProductInput>(request, {
      name: { type: 'string', required: false },
      description: { type: 'string', required: false },
      priceCents: { type: 'number', required: false },
      currency: { type: 'string', required: false },
      stock: { type: 'number', required: false },
    });
    if (!body.ok) return body.response;

    const { productService } = await getContainer();
    return resultResponse(await productService.updateProduct(params.id, body.value));
  } catch {
    return internalError();
  }
};

/** DELETE /api/products/:id — delete a product. */
export const DELETE: APIRoute = async ({ params }) => {
  try {
    if (!params.id) return badRequest('Product id is required');
    const { productService } = await getContainer();
    const result = await productService.deleteProduct(params.id);
    return result.ok ? jsonResponse({ deleted: true }) : resultResponse(result);
  } catch {
    return internalError();
  }
};
