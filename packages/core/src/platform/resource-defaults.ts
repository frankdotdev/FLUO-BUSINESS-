import type { PolicyKind } from "./availability.ts";
import type { PriceUnit } from "../services/ports.ts";

export interface PolicyDefaults { minDurationMinutes: number; maxDurationMinutes: number | null; granularityMinutes: number; bufferMinutes: number; minNoticeMinutes: number; maxAdvanceMinutes: number | null; priceUnit: PriceUnit }
/** Sensible starting rules per kind so a business owner only has to name the thing, set a price and list the units. */
export function policyDefaults(kind: PolicyKind): PolicyDefaults {
  switch (kind) {
    case "nights":        return { minDurationMinutes: 1440, maxDurationMinutes: 43_200, granularityMinutes: 60, bufferMinutes: 120, minNoticeMinutes: 0, maxAdvanceMinutes: 525_600, priceUnit: "per_night" };
    case "time_block":    return { minDurationMinutes: 60, maxDurationMinutes: 480, granularityMinutes: 30, bufferMinutes: 0, minNoticeMinutes: 120, maxAdvanceMinutes: 43_200, priceUnit: "per_hour" };
    case "rental_period": return { minDurationMinutes: 60, maxDurationMinutes: 43_200, granularityMinutes: 60, bufferMinutes: 60, minNoticeMinutes: 60, maxAdvanceMinutes: 525_600, priceUnit: "per_day" };
    case "bed":           return { minDurationMinutes: 1440, maxDurationMinutes: 43_200, granularityMinutes: 60, bufferMinutes: 60, minNoticeMinutes: 0, maxAdvanceMinutes: 525_600, priceUnit: "per_bed_night" };
  }
}
