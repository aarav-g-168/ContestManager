"use client";
import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { Check } from "lucide-react";
import { useAccountPreferences } from "@/features/account/components/AccountPreferencesProvider";
import {
  REMINDER_OPTIONS,
  reminderOffset,
  reminderTimeLabel,
  type ReminderType,
  type SavedReminderType,
} from "@/features/reminders/lib/timing";
export default function ReminderChoices({
  start,
  now,
  disabled,
  selected,
  onChoose,
}: {
  start: number;
  now: number;
  disabled: boolean;
  selected?: SavedReminderType;
  onChoose: (type: ReminderType) => void;
}) {
  const preferences = useAccountPreferences(),
    value = preferences.data?.defaultReminder ?? "15m";
  if (preferences.data?.remindersPaused)
    return (
      <DropdownMenu.Item asChild>
        <Link href="/settings" className="menu-item min-h-11">
          Emails paused · manage preferences
        </Link>
      </DropdownMenu.Item>
    );
  return (
    <>
      {[value, ...REMINDER_OPTIONS.filter((type) => type !== value)].map(
        (type) => (
          <DropdownMenu.Item
            key={type}
            className="menu-item min-h-11 justify-between"
            disabled={
              disabled ||
              preferences.loading ||
              start - reminderOffset(type) <= now
            }
            onSelect={() => onChoose(type)}
          >
            <span>
              {reminderTimeLabel(type)} before
              {type === value && (
                <small className="ml-2 text-muted-foreground">Default</small>
              )}
            </span>
            {selected === type && <Check size={14} aria-hidden="true" />}
          </DropdownMenu.Item>
        ),
      )}
      {preferences.loading && (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          Loading preferences…
        </p>
      )}
      {start - reminderOffset("15m") <= now && (
        <p className="px-3 py-2 text-xs leading-5 text-muted-foreground">
          The available reminder times have passed.
        </p>
      )}
    </>
  );
}
