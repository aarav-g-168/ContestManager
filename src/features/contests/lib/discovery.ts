import type { Contest } from "@/features/contests/types";
import { getPlatformKey } from "@/features/contests/lib/platforms";
import { parseAsUTC } from "@/lib/date";

export const DISCOVERY_TIMES = {
  any: "Any time",
  morning: "Morning · 6am–12pm",
  afternoon: "Afternoon · 12pm–6pm",
  evening: "Evening · 6pm–12am",
  night: "Night · 12am–6am",
} as const;
export type DiscoveryPreferences = {
  enabled: boolean;
  platforms: string[];
  days: number[]; // Sunday = 0; an empty list means any day, in IST.
  time: keyof typeof DISCOVERY_TIMES;
  maxMinutes: number | null;
};
export const DEFAULT_DISCOVERY: DiscoveryPreferences = {
  enabled: true,
  platforms: [],
  days: [],
  time: "any",
  maxMinutes: null,
};
export function validateDiscovery(input: unknown): DiscoveryPreferences {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Choose valid discovery preferences.");
  const raw = input as Record<string, unknown>;
  if (
    typeof raw.enabled !== "boolean" ||
    !Array.isArray(raw.platforms) ||
    raw.platforms.length > 12 ||
    raw.platforms.some(
      (host) =>
        typeof host !== "string" ||
        host.length > 100 ||
        !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(host),
    ) ||
    !Array.isArray(raw.days) ||
    raw.days.length > 7 ||
    raw.days.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
    typeof raw.time !== "string" ||
    !Object.hasOwn(DISCOVERY_TIMES, raw.time) ||
    (raw.maxMinutes !== null &&
      ![60, 120, 180].includes(Number(raw.maxMinutes))) ||
    (raw.maxMinutes !== null && typeof raw.maxMinutes !== "number")
  )
    throw new Error(
      "Choose valid platforms, days, start times and contest length.",
    );
  return {
    enabled: raw.enabled,
    platforms: [...new Set(raw.platforms as string[])].sort(),
    days: [...new Set(raw.days as number[])].sort(),
    time: raw.time as DiscoveryPreferences["time"],
    maxMinutes: raw.maxMinutes as number | null,
  };
}
export function hasDiscoveryPreferences(preferences: DiscoveryPreferences) {
  return !!(
    preferences.platforms.length ||
    preferences.days.length ||
    preferences.time !== "any" ||
    preferences.maxMinutes
  );
}
export function recommendContests(
  contests: Contest[],
  preferences: DiscoveryPreferences,
  now: number,
  limit = 3,
) {
  const unique = new Map(contests.map((contest) => [contest.id, contest]));
  return [...unique.values()]
    .flatMap((contest) => {
      const start = parseAsUTC(contest.start).getTime();
      if (!Number.isFinite(start) || start <= now) return [];
      const ist = new Date(start + 330 * 60000);
      const reasons: string[] = [];
      let score = 0;
      if (preferences.enabled) {
        if (preferences.platforms.includes(getPlatformKey(contest.host))) {
          score += 4;
          reasons.push("Favourite platform");
        }
        if (preferences.days.includes(ist.getUTCDay())) {
          score += 2;
          reasons.push("Fits your days");
        }
        const hour = ist.getUTCHours();
        const slot =
          hour < 6
            ? "night"
            : hour < 12
              ? "morning"
              : hour < 18
                ? "afternoon"
                : "evening";
        if (preferences.time !== "any" && preferences.time === slot) {
          score += 2;
          reasons.push("Fits your start time");
        }
        if (
          preferences.maxMinutes &&
          contest.duration > 0 &&
          contest.duration <= preferences.maxMinutes * 60
        ) {
          score++;
          reasons.push(`Within ${preferences.maxMinutes / 60}h`);
        }
      }
      return [{ contest, score, reasons, start }];
    })
    .sort(
      (a, b) =>
        b.score - a.score || a.start - b.start || a.contest.id - b.contest.id,
    )
    .slice(0, limit);
}
