"use client";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { accountRequest } from "@/features/auth/lib/client-api";
import { useAccountCollection } from "@/features/auth/hooks/useAccountCollection";
import type { Contest } from "@/features/contests/types";
import { toast } from "sonner";
export type ReminderType = "1h" | "6h" | "24h";
export interface ReminderInfo {
  contestId: number;
  reminderType: ReminderType;
  status: string;
}
const empty = { reminders: [] as ReminderInfo[] };
export function useReminders() {
  const { user, login } = useAuth();
  const state = useAccountCollection("/api/reminders", empty);
  const reminders = Object.fromEntries(
    state.value.reminders.map((row) => [row.contestId, row.reminderType]),
  ) as Record<number, ReminderType>;
  const statuses = Object.fromEntries(
    state.value.reminders.map((row) => [row.contestId, row.status]),
  ) as Record<number, string>;
  async function addReminder(contest: Contest, reminderType: ReminderType) {
    if (!user) {
      toast("Sign in to get contest reminders.", {
        action: { label: "Sign in", onClick: login },
      });
      return;
    }
    try {
      await accountRequest(user, "/api/reminders", {
        method: "PUT",
        body: JSON.stringify({ contestId: contest.id, reminderType }),
      });
      await state.reload();
      toast.success("Reminder saved. We’re confirming the email schedule.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't set your reminder.",
      );
    }
  }
  async function removeReminder(contestId: number) {
    if (!user) return;
    try {
      await accountRequest(user, `/api/reminders?contestId=${contestId}`, {
        method: "DELETE",
      });
      await state.reload();
      toast.success(
        "Cancellation requested. An email already sent cannot be recalled.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't remove your reminder.",
      );
    }
  }
  return {
    reminders,
    statuses,
    addReminder,
    removeReminder,
    loading: state.loading,
    error: state.error,
  };
}
