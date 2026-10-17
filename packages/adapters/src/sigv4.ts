import { createHash, createHmac } from "node:crypto";

// AWS Signature Version 4 for S3-compatible storage (Cloudflare R2 uses it). No dependencies.
const hex = (b: Buffer | string): string => (typeof b === "string" ? Buffer.from(b) : b).toString("hex");
export const sha256Hex = (data: Uint8Array | string): string => createHash("sha256").update(data).digest("hex");
const hmac = (key: Buffer | string, data: string): Buffer => createHmac("sha256", key).update(data).digest();
/** RFC 3986 encoding as AWS requires (also encodes ! ' ( ) *). */
export const awsEncode = (s: string): string => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
export const encodePath = (path: string): string => path.split("/").map(awsEncode).join("/");

export interface Creds { accessKeyId: string; secretAccessKey: string; region: string; service?: string }
const signingKey = (c: Creds, date: string): Buffer => hmac(hmac(hmac(hmac(`AWS4${c.secretAccessKey}`, date), c.region), c.service ?? "s3"), "aws4_request");
export const amzDate = (d: Date): string => d.toISOString().replace(/[-:]|\.\d{3}/g, "");

/** A URL that lets its holder perform ONE kind of request on ONE object until it expires. Signed headers (content type, length) are enforced by the storage. */
export function presign(c: Creds, a: { method: string; host: string; path: string; expiresSec: number; now: Date; signedHeaders?: Record<string, string> }): string {
  const stamp = amzDate(a.now), date = stamp.slice(0, 8);
  const headers: Record<string, string> = { host: a.host, ...Object.fromEntries(Object.entries(a.signedHeaders ?? {}).map(([k, v]) => [k.toLowerCase(), v])) };
  const names = Object.keys(headers).sort();
  const query: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256", "X-Amz-Credential": `${c.accessKeyId}/${date}/${c.region}/${c.service ?? "s3"}/aws4_request`,
    "X-Amz-Date": stamp, "X-Amz-Expires": String(a.expiresSec), "X-Amz-SignedHeaders": names.join(";"),
  };
  const canonicalQuery = Object.keys(query).sort().map((k) => `${awsEncode(k)}=${awsEncode(query[k]!)}`).join("&");
  const canonical = [a.method, encodePath(a.path), canonicalQuery, ...names.map((n) => `${n}:${headers[n]!.trim()}`), "", names.join(";"), "UNSIGNED-PAYLOAD"].join("\n");
  const scope = `${date}/${c.region}/${c.service ?? "s3"}/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", stamp, scope, sha256Hex(canonical)].join("\n");
  const signature = hex(hmac(signingKey(c, date), toSign));
  return `https://${a.host}${encodePath(a.path)}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

/** Headers for a server-side request signed with the Authorization header. */
export function signHeaders(c: Creds, a: { method: string; host: string; path: string; body: Uint8Array | string; now: Date; headers?: Record<string, string> }): Record<string, string> {
  const stamp = amzDate(a.now), date = stamp.slice(0, 8), payloadHash = sha256Hex(a.body);
  const all: Record<string, string> = { ...Object.fromEntries(Object.entries(a.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v])), host: a.host, "x-amz-content-sha256": payloadHash, "x-amz-date": stamp };
  const names = Object.keys(all).sort();
  const canonical = [a.method, encodePath(a.path), "", ...names.map((n) => `${n}:${all[n]!.trim()}`), "", names.join(";"), payloadHash].join("\n");
  const scope = `${date}/${c.region}/${c.service ?? "s3"}/aws4_request`;
  const signature = hex(hmac(signingKey(c, date), ["AWS4-HMAC-SHA256", stamp, scope, sha256Hex(canonical)].join("\n")));
  const { host: _host, ...send } = all; void _host;                                     // fetch sets Host itself
  return { ...send, authorization: `AWS4-HMAC-SHA256 Credential=${c.accessKeyId}/${scope}, SignedHeaders=${names.join(";")}, Signature=${signature}` };
}
