import {
  isReminderType,
  type ReminderType,
} from "@/features/reminders/lib/timing";
import { ProfileRequestError } from "@/lib/http/request-error";
export type AccountSettings = {
  defaultReminder: ReminderType;
  remindersPaused: boolean;
  onboardingDismissed: boolean;
  revision: number | null;
  deleting: boolean;
  hasPhoto?: boolean;
  onboarding?: { saved: boolean; reminded: boolean; journaled: boolean };
};
export type SettingsValues = Pick<
  AccountSettings,
  "defaultReminder" | "remindersPaused" | "onboardingDismissed" | "revision"
>;
export function validateSettings(input: unknown): SettingsValues {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new ProfileRequestError("Choose valid account preferences.", 400);
  const raw = input as Record<string, unknown>;
  if (
    !isReminderType(raw.defaultReminder) ||
    typeof raw.remindersPaused !== "boolean" ||
    typeof raw.onboardingDismissed !== "boolean" ||
    (raw.revision !== null &&
      (!Number.isSafeInteger(raw.revision) ||
        Number(raw.revision) < 0 ||
        Number(raw.revision) > 2147483646))
  )
    throw new ProfileRequestError(
      "Choose valid preferences and reload before saving.",
      400,
    );
  return {
    defaultReminder: raw.defaultReminder,
    remindersPaused: raw.remindersPaused,
    onboardingDismissed: raw.onboardingDismissed,
    revision: raw.revision as number | null,
  };
}
