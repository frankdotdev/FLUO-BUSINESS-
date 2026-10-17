import type { ObjectStorage } from "@fluo/core";
import { ProviderError, type Fetch } from "./http.ts";
import { encodePath, presign, signHeaders, type Creds } from "./sigv4.ts";

export interface R2Config { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string; fetch?: Fetch; now?: () => Date }

/** Cloudflare R2 through its S3-compatible API (region "auto"). Browsers upload with a signed URL that pins the content type and size;
 *  the server reads, validates and republishes. */
export function createR2Storage(cfg: R2Config): ObjectStorage {
  const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
  const creds: Creds = { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey, region: "auto" };
  const f: Fetch = cfg.fetch ?? ((u, i) => fetch(u, i));
  const now = cfg.now ?? (() => new Date());
  const path = (key: string): string => `/${cfg.bucket}/${key}`;
  const call = async (method: string, key: string, body: Uint8Array | string, headers: Record<string, string> = {}): Promise<Response> => {
    const signed = signHeaders(creds, { method, host, path: path(key), body, now: now(), headers });
    return f(`https://${host}${encodePath(path(key))}`, { method, headers: signed, ...(method === "PUT" ? { body: body as BodyInit } : {}), signal: AbortSignal.timeout(30_000) });
  };
  return {
    async presignPut({ key, contentType, contentLength, expiresSec }) {
      const url = presign(creds, { method: "PUT", host, path: path(key), expiresSec, now: now(), signedHeaders: { "content-type": contentType, "content-length": String(contentLength) } });
      return { url, headers: { "content-type": contentType } };      // the browser adds Content-Length itself
    },
    async get(key, maxBytes) {
      const r = await call("GET", key, "");
      if (r.status === 404) return null;
      if (!r.ok) throw new ProviderError(`storage read failed (${r.status})`, r.status);
      const declared = Number(r.headers.get("content-length") ?? 0);
      if (declared > maxBytes) return null;
      const bytes = new Uint8Array(await r.arrayBuffer());
      return bytes.length > maxBytes ? null : bytes;
    },
    async put(key, bytes, contentType, cacheControl) {
      const r = await call("PUT", key, bytes, { "content-type": contentType, ...(cacheControl ? { "cache-control": cacheControl } : {}) });
      if (!r.ok) throw new ProviderError(`storage write failed (${r.status})`, r.status);
    },
    async delete(key) {
      const r = await call("DELETE", key, "");
      if (!r.ok && r.status !== 404) throw new ProviderError(`storage delete failed (${r.status})`, r.status);
    },
  };
}
