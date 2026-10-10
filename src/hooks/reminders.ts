"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";
import type { Contest } from "@/types/contest";
import { parseAsUTC } from "@/lib/date";
export type ReminderType = "1h" | "6h" | "24h";
export function useReminders() {
  const { user, loading: authLoading, login } = useAuth();
  const [saved, setSaved] = useState<{
    uid: string;
    values: Record<number, ReminderType>;
  } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    setError(false);
    if (!user) {
      setSaved(null);
      return;
    }
    return onSnapshot(
      collection(db, "users", user.uid, "reminders"),
      (snapshot) => {
        const values: Record<number, ReminderType> = {};
        snapshot.docs.forEach((item) => {
          values[Number(item.id)] = item.data().reminderType;
        });
        setSaved({ uid: user.uid, values });
      },
      () => {
        setError(true);
        setSaved({ uid: user.uid, values: {} });
      },
    );
  }, [user]);
  const reminders = saved?.uid === user?.uid ? (saved?.values ?? {}) : {};
  async function addReminder(contest: Contest, reminderType: ReminderType) {
    if (!user) {
      toast("Sign in to get contest reminders.", {
        action: { label: "Sign in", onClick: login },
      });
      return;
    }
    if (!user.email) {
      toast.error("Your account needs an email address to receive reminders.");
      return;
    }
    if (
      parseAsUTC(contest.start).getTime() -
        Number(reminderType.replace("h", "")) * 3600000 <=
      Date.now()
    ) {
      toast.error(
        "That reminder time has already passed. Choose a shorter reminder.",
      );
      return;
    }
    try {
      await setDoc(
        doc(db, "users", user.uid, "reminders", String(contest.id)),
        {
          contestId: contest.id,
          event: contest.event,
          host: contest.host,
          href: contest.href,
          start: parseAsUTC(contest.start).toISOString(),
          duration: contest.duration,
          reminderType,
          email: user.email,
          sent: false,
          createdAt: new Date(),
        },
      );
      toast.success(
        `We'll email you ${reminderType.replace("h", "")} hour${reminderType === "1h" ? "" : "s"} before the contest.`,
      );
    } catch {
      toast.error("Couldn't set your reminder. Please try again.");
    }
  }
  async function removeReminder(contestId: number) {
    if (!user) return;
    try {
      await deleteDoc(
        doc(db, "users", user.uid, "reminders", String(contestId)),
      );
      toast.success("Reminder removed.");
    } catch {
      toast.error("Couldn't remove your reminder. Please try again.");
    }
  }
  return {
    reminders,
    addReminder,
    removeReminder,
    loading: authLoading || (!!user && saved?.uid !== user.uid),
    error,
  };
}
