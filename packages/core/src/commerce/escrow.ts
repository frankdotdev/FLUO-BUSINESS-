// Escrow engine for delivery handoffs, custom orders, and milestone services.
// Keeps buyer funds secure until physical QR scan or 4-digit PIN confirmation.

import { createHmac, timingSafeEqual } from "node:crypto";

export type EscrowStatus = "none" | "held" | "disputed" | "released" | "refunded";

export interface EscrowRecord {
  readonly orderId: string;
  readonly businessId: string;
  readonly buyerUserId: string | null;
  readonly amountMinor: bigint;
  readonly currency: string;
  readonly status: EscrowStatus;
  readonly releasePinHash: string;
  readonly qrSecretHash: string;
  readonly heldAtMs: number;
  readonly releasedAtMs: number | null;
  readonly disputedAtMs: number | null;
  readonly disputeReason: string | null;
}

export interface GeneratedEscrowSecrets {
  readonly pin: string;
  readonly qrToken: string;
  readonly releasePinHash: string;
  readonly qrSecretHash: string;
}

const TRANSITIONS: Record<EscrowStatus, readonly EscrowStatus[]> = {
  none: ["held"],
  held: ["released", "disputed", "refunded"],
  disputed: ["released", "refunded"],
  released: [],
  refunded: [],
};

export function canTransitionEscrow(from: EscrowStatus, to: EscrowStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

function hashValue(secretKey: string, val: string): string {
  return createHmac("sha256", secretKey).update(val).digest("hex");
}

/**
 * Generates an escrow 4-digit confirmation PIN and signed QR token for the buyer.
 * Uses deterministic HMAC derivation so the authorized buyer can always display their delivery
 * credentials without storing plaintext secrets in the database.
 */
export function generateEscrowSecrets(secretKey: string, orderId: string): GeneratedEscrowSecrets {
  const hmac = createHmac("sha256", secretKey).update(`escrow-pin:${orderId}`).digest();
  const num = (hmac.readUInt16BE(0) % 9000) + 1000;
  const pin = String(num);
  const qrPayload = `${orderId}:${pin}`;
  const signature = createHmac("sha256", secretKey).update(qrPayload).digest("base64url");
  const qrToken = `${Buffer.from(qrPayload).toString("base64url")}.${signature}`;

  const releasePinHash = hashValue(secretKey, `${orderId}:${pin}`);
  const qrSecretHash = hashValue(secretKey, qrToken);

  return { pin, qrToken, releasePinHash, qrSecretHash };
}

/**
 * Validates a buyer's 4-digit PIN against the stored hash.
 */
export function verifyEscrowPin(secretKey: string, orderId: string, providedPin: string, storedHash: string): boolean {
  if (!/^\d{4}$/.test(providedPin)) return false;
  const computedHash = hashValue(secretKey, `${orderId}:${providedPin}`);
  const a = Buffer.from(computedHash, "utf-8");
  const b = Buffer.from(storedHash, "utf-8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Validates a scanned QR token and extracts the corresponding orderId.
 */
export function verifyEscrowQr(secretKey: string, qrToken: string): { valid: boolean; orderId?: string } {
  const parts = qrToken.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { valid: false };
  const [b64Payload, signature] = parts;

  try {
    const rawPayload = Buffer.from(b64Payload, "base64url").toString("utf-8");
    const [orderId, pin] = rawPayload.split(":");
    if (!orderId || !pin) return { valid: false };

    const expectedSig = createHmac("sha256", secretKey).update(rawPayload).digest("base64url");
    const a = Buffer.from(signature, "utf-8");
    const b = Buffer.from(expectedSig, "utf-8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { valid: false };

    return { valid: true, orderId };
  } catch {
    return { valid: false };
  }
}
