export class ProviderError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.name = "ProviderError"; this.status = status; }
}
export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

/** JSON request with a timeout. Error messages never include request headers (which carry secrets). */
export async function jsonRequest(f: Fetch, url: string, init: { method: string; headers: Record<string, string>; body?: unknown; timeoutMs?: number }): Promise<any> {
  const res = await f(url, {
    method: init.method,
    headers: { "content-type": "application/json", accept: "application/json", ...init.headers },
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    signal: AbortSignal.timeout(init.timeoutMs ?? 15_000),
  });
  let data: any = null;
  try { data = await res.json(); } catch { /* non-JSON error body */ }
  if (!res.ok) throw new ProviderError(`${new URL(url).hostname} responded ${res.status}${data?.message ? `: ${String(data.message).slice(0, 200)}` : ""}`, res.status);
  return data;
}
