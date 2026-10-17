import { type Money, money } from "../money.ts";
import type { PriceUnit } from "../services/ports.ts";

const HOUR = 3_600_000, DAY = 24 * HOUR;
/** Price from the group's configured unit price and the (already validated) interval. Always computed on the server. */
export function priceForInterval(unit: PriceUnit, unitPriceMinor: bigint, currency: string, startMs: number, endMs: number): Money {
  const dur = endMs - startMs;
  if (!(dur > 0)) throw new Error("invalid_interval");
  const units = unit === "flat" ? 1 : unit === "per_hour" ? Math.ceil(dur / HOUR) : Math.ceil(dur / DAY);   // night/day/bed-night: any started 24h counts
  return money(unitPriceMinor * BigInt(units), currency);
}
