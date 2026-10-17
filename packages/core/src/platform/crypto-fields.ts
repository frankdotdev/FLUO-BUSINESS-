import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Field-level encryption for sensitive values stored in the database (e.g. a business's transfer account number).
// AES-256-GCM, random 12-byte nonce, key id embedded so keys can be rotated. Format: v1:keyId:iv:tag:ciphertext
export type KeyRing = Readonly<Record<string, Buffer>>;   // keyId -> 32-byte key (from secret storage, never the database)

export function encryptField(keys: KeyRing, keyId: string, plaintext: string): string {
  const key = keys[keyId];
  if (!key || key.length !== 32) throw new Error("invalid_key");
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(plaintext, "utf8"), c.final()]);
  return ["v1", keyId, iv.toString("base64url"), c.getAuthTag().toString("base64url"), ct.toString("base64url")].join(":");
}

export function decryptField(keys: KeyRing, stored: string): string {
  const [v, keyId, iv, tag, ct, extra] = stored.split(":");
  if (v !== "v1" || !keyId || !iv || !tag || !ct || extra !== undefined) throw new Error("invalid_format");
  const key = keys[keyId];
  if (!key || key.length !== 32) throw new Error("invalid_key");
  const d = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");   // throws if tampered
}
