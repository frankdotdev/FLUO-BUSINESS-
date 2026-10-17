// Weekly business operating hours and "Open Now" status evaluation.
// All evaluations are timezone-aware and depend solely on the business's configured IANA timezone.

export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface DaySchedule {
  readonly open: boolean;
  readonly openTime: string; // "HH:MM"
  readonly closeTime: string; // "HH:MM"
}

export type WeeklySchedule = Readonly<Record<DayOfWeek, DaySchedule>>;

export const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  mon: { open: true, openTime: "08:00", closeTime: "20:00" },
  tue: { open: true, openTime: "08:00", closeTime: "20:00" },
  wed: { open: true, openTime: "08:00", closeTime: "20:00" },
  thu: { open: true, openTime: "08:00", closeTime: "20:00" },
  fri: { open: true, openTime: "08:00", closeTime: "20:00" },
  sat: { open: true, openTime: "09:00", closeTime: "18:00" },
  sun: { open: false, openTime: "12:00", closeTime: "18:00" },
};

const DAY_MAP: readonly DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export interface OpenStatus {
  readonly isOpen: boolean;
  readonly label: string;
  readonly day: DayOfWeek;
  readonly localTime: string;
}

function parseMins(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Checks whether a business is currently open based on its weekly operating schedule
 * and business timezone.
 */
export function isBusinessOpenNow(
  schedule: Partial<WeeklySchedule> | null | undefined,
  timezone: string,
  nowMs = Date.now()
): OpenStatus {
  const fullSchedule: WeeklySchedule = { ...DEFAULT_WEEKLY_SCHEDULE, ...(schedule ?? {}) };

  // Resolve current weekday and time in the business timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  });

  const parts = formatter.formatToParts(new Date(nowMs));
  const weekdayShort = parts.find((p) => p.type === "weekday")?.value.toLowerCase().slice(0, 3) as DayOfWeek;
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);

  const dayOfWeek = (weekdayShort && DAY_MAP.includes(weekdayShort)) ? weekdayShort : "mon";
  const currentMins = hour * 60 + minute;
  const localTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  const dayPlan = fullSchedule[dayOfWeek];

  if (!dayPlan.open) {
    return { isOpen: false, label: "Closed today", day: dayOfWeek, localTime };
  }

  const openMins = parseMins(dayPlan.openTime);
  const closeMins = parseMins(dayPlan.closeTime);

  if (currentMins >= openMins && currentMins < closeMins) {
    return {
      isOpen: true,
      label: `Open now (until ${dayPlan.closeTime})`,
      day: dayOfWeek,
      localTime,
    };
  }

  if (currentMins < openMins) {
    return {
      isOpen: false,
      label: `Closed (opens at ${dayPlan.openTime})`,
      day: dayOfWeek,
      localTime,
    };
  }

  return {
    isOpen: false,
    label: `Closed (closed at ${dayPlan.closeTime})`,
    day: dayOfWeek,
    localTime,
  };
}
