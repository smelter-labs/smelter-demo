// Raw HTTP access to the Smelter server spawned by `SmelterInstance`.
// smelter-node spawns it on SMELTER_API_PORT (default 8000).
const SMELTER_API_PORT = Number(process.env.SMELTER_API_PORT) || 8000;

export const SMELTER_API_URL = `http://127.0.0.1:${SMELTER_API_PORT}`;
export const SMELTER_WS_URL = `ws://127.0.0.1:${SMELTER_API_PORT}/ws`;

export class SmelterApiError extends Error {
  constructor(
    public status: number,
    public body: unknown
  ) {
    super(`Smelter request failed with status ${status}`);
  }
}

export async function smelterRequest(
  method: 'GET' | 'POST',
  route: string,
  body?: unknown
): Promise<any> {
  const response = await fetch(`${SMELTER_API_URL}${route}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // keep raw text
  }
  if (response.status >= 400) {
    throw new SmelterApiError(response.status, parsed);
  }
  return parsed;
}

export type ResourceKind = 'input' | 'output' | 'image' | 'shader';

export async function unregisterResource(kind: ResourceKind, rawId: string): Promise<void> {
  try {
    await smelterRequest('POST', `/api/${kind}/${encodeURIComponent(rawId)}/unregister`, {});
  } catch (err: any) {
    // Already gone (e.g. output-specific inputs removed together with their output).
    if (err instanceof SmelterApiError && err.status < 500) {
      return;
    }
    console.warn('[playground] Failed to unregister', { kind, rawId, err: err?.body ?? err });
  }
}
