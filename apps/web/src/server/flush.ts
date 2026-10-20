import { after } from "next/server";
import { drainOutbox } from "@fluo/core";
import { container } from "./container.ts";

/** Sends queued emails and push notifications right after the response goes out, so "payment confirmed" and "your ticket" arrive in seconds.
 *  The scheduled call to /api/cron remains the safety net for retries and reminders. Concurrent flushes are safe: rows are claimed with a lease. */
export function scheduleFlush(): void {
  const runDrain = async () => {
    try {
      const c = container();
      await drainOutbox(c.deps, { email: c.email, push: c.push }, 20);
    } catch (e) {
      console.error("notification flush failed:", (e as Error).message);
    }
  };

  try {
    after(runDrain);
  } catch {
    runDrain().catch(() => {});
  }
}
