import type { APIContext, APIRoute } from 'astro';

const BASE = 'http://localhost/api';

export async function call(
  handler: APIRoute,
  options: {
    method?: string;
    path?: string;
    params?: Record<string, string>;
    body?: unknown;
    rawBody?: string;
  } = {},
): Promise<{ status: number; body: any }> {
  const init: RequestInit = { method: options.method ?? 'GET' };
  if (options.rawBody !== undefined) {
    init.body = options.rawBody;
  } else if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
    init.headers = { 'Content-Type': 'application/json' };
  }

  const request = new Request(`${BASE}${options.path ?? ''}`, init);
  const response = await handler({ request, params: options.params ?? {} } as unknown as APIContext);
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}
