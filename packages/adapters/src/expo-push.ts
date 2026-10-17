import type { PushProvider } from "@fluo/core";
import { jsonRequest, type Fetch } from "./http.ts";

const TOKEN = /^Expo(nent)?PushToken\[[^\]]+\]$/;

/** Expo push service (mobile). Returns tokens that are no longer valid so the caller can delete them. */
export function createExpoPushProvider(cfg: { accessToken?: string; fetch?: Fetch } = {}): PushProvider {
  const f: Fetch = cfg.fetch ?? ((u, i) => fetch(u, i));
  return {
    async send(msgs) {
      const invalid: string[] = [];
      const valid = msgs.filter((m) => (TOKEN.test(m.token) ? true : (invalid.push(m.token), false)));
      for (let i = 0; i < valid.length; i += 100) {
        const chunk = valid.slice(i, i + 100);
        const r = await jsonRequest(f, "https://exp.host/--/api/v2/push/send", {
          method: "POST", headers: cfg.accessToken ? { authorization: `Bearer ${cfg.accessToken}` } : {},
          body: chunk.map((m) => ({ to: m.token, title: m.title, body: m.body, data: m.data ?? {}, sound: "default" })),
        });
        (r?.data ?? []).forEach((t: any, idx: number) => { if (t?.status === "error" && t?.details?.error === "DeviceNotRegistered") invalid.push(chunk[idx]!.token); });
      }
      return { invalidTokens: invalid };
    },
  };
}
