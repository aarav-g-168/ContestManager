import { getContestDay } from "@/features/contests/lib/calendar";
import { ProfileRequestError } from "@/lib/http/request-error";

export const GOAL_LIMITS = { contests: 21, problems: 500 } as const;
export type GoalTargets = { contests: number; problems: number };
export type GoalWeek = {
  start: string;
  end: string;
  startAt: string;
  endAt: string;
  today: string;
};
export type WeeklyGoalsSnapshot = {
  asOf: string;
  week: GoalWeek;
  targets: GoalTargets;
  revision: number | null;
  counts: GoalTargets;
};
/** Monday through Sunday in IST, independent of the device timezone. */
export function goalWeek(now = new Date()): GoalWeek {
  const today = getContestDay(now);
  const day = new Date(`${today}T00:00:00Z`);
  const monday = new Date(
    day.getTime() - ((day.getUTCDay() + 6) % 7) * 86400000,
  );
  const start = monday.toISOString().slice(0, 10);
  const end = new Date(monday.getTime() + 6 * 86400000)
    .toISOString()
    .slice(0, 10);
  const next = new Date(monday.getTime() + 7 * 86400000)
    .toISOString()
    .slice(0, 10);
  return {
    start,
    end,
    today,
    startAt: new Date(`${start}T00:00:00+05:30`).toISOString(),
    endAt: new Date(`${next}T00:00:00+05:30`).toISOString(),
  };
}
export function validateGoals(input: unknown, now = new Date()) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new ProfileRequestError("Enter valid weekly goals.", 400);
  const raw = input as Record<string, unknown>;
  const week = goalWeek(now);
  if (raw.weekStart !== week.start)
    throw new ProfileRequestError(
      "A new week has started. Refresh your goals before saving.",
      409,
    );
  if (
    raw.revision !== null &&
    (!Number.isSafeInteger(raw.revision) ||
      Number(raw.revision) < 0 ||
      Number(raw.revision) > 2147483646)
  )
    throw new ProfileRequestError("Refresh your goals before saving.", 400);
  for (const key of ["contests", "problems"] as const) {
    const value = raw[key];
    if (
      typeof value !== "number" ||
      !Number.isSafeInteger(value) ||
      value < 0 ||
      value > GOAL_LIMITS[key]
    )
      throw new ProfileRequestError(
        `Use a whole number from 0 to ${GOAL_LIMITS[key]} for ${key}.`,
        400,
      );
  }
  return {
    weekStart: week.start,
    revision: raw.revision as number | null,
    contests: raw.contests as number,
    problems: raw.problems as number,
  };
}
export function goalPercent(count: number, target: number) {
  return target > 0 ? Math.min(100, Math.round((count / target) * 100)) : 0;
}
