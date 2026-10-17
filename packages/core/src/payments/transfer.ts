import { randomBytes } from "node:crypto";

// Manual bank transfer (most campus vendors' preferred method). Fluo cannot verify it: the BUSINESS confirms receipt.
export const TRANSFER_HOLD_HOURS = 24;
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";   // no 0/O/1/I/L: easy to read out and type

/** Short reference the customer puts in the transfer narration so the vendor can match it: FLU-7K3M9Q */
export function newTransferReference(): string {
  let out = "";
  for (const b of randomBytes(6)) out += ALPHABET[b % ALPHABET.length];
  return `FLU-${out}`;
}
export const isTransferReference = (s: string): boolean => /^FLU-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/.test(s);
