export const REMINDER_OPTIONS = ["15m", "1h", "3h"] as const;
export type ReminderType = (typeof REMINDER_OPTIONS)[number];
export type SavedReminderType = ReminderType | "6h" | "24h";
const timings = {
  "15m": 900000,
  "1h": 3600000,
  "3h": 10800000,
  "6h": 21600000,
  "24h": 86400000,
} as const;
export function isReminderType(value: unknown): value is ReminderType {
  return (
    typeof value === "string" &&
    (REMINDER_OPTIONS as readonly string[]).includes(value)
  );
}
export function isSavedReminderType(
  value: unknown,
): value is SavedReminderType {
  return typeof value === "string" && Object.hasOwn(timings, value);
}
export function reminderOffset(value: SavedReminderType) {
  return timings[value];
}
export function reminderTimeLabel(value: SavedReminderType) {
  return value === "15m"
    ? "15 minutes"
    : `${value.slice(0, -1)} hour${value === "1h" ? "" : "s"}`;
}
export function reminderEmailLabel(value: string) {
  return isSavedReminderType(value)
    ? `${value === "15m" ? "15-minute" : `${value.slice(0, -1)}-hour`} reminder`
    : "contest reminder";
}
