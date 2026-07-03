import type { DomainError, DomainErrorCode } from '@domain/shared/DomainError';
import type { Result } from '@domain/shared/Result';

const STATUS_BY_CODE: Record<DomainErrorCode, number> = {
  VALIDATION: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  BUSINESS_RULE: 422,
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

export function errorResponse(error: DomainError): Response {
  return jsonResponse(
    { error: { code: error.code, message: error.message, details: error.details } },
    STATUS_BY_CODE[error.code],
  );
}

export function resultResponse<T>(result: Result<T, DomainError>, successStatus = 200): Response {
  return result.ok ? jsonResponse(result.value, successStatus) : errorResponse(result.error);
}

export function badRequest(message: string): Response {
  return jsonResponse({ error: { code: 'VALIDATION', message } }, 400);
}

export function internalError(): Response {
  return jsonResponse({ error: { code: 'INTERNAL', message: 'An unexpected error occurred' } }, 500);
}

export async function parseJsonBody<T>(
  request: Request,
  schema: Record<keyof T & string, FieldSpec>,
): Promise<{ ok: true; value: T } | { ok: false; response: Response }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: badRequest('Request body must be valid JSON') };
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, response: badRequest('Request body must be a JSON object') };
  }

  const body = raw as Record<string, unknown>;
  const value: Record<string, unknown> = {};

  for (const [field, spec] of Object.entries(schema) as [string, FieldSpec][]) {
    const present = field in body && body[field] !== undefined && body[field] !== null;
    if (!present) {
      if (spec.required) {
        return { ok: false, response: badRequest(`Field "${field}" is required`) };
      }
      continue;
    }
    const actual = typeof body[field];
    if (actual !== spec.type) {
      return {
        ok: false,
        response: badRequest(`Field "${field}" must be a ${spec.type}, received ${actual}`),
      };
    }
    value[field] = body[field];
  }

  return { ok: true, value: value as T };
}

export interface FieldSpec {
  type: 'string' | 'number' | 'boolean';
  required: boolean;
}
