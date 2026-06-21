"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { toast } from "sonner";

import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

import { onAuthStateChanged, User } from "firebase/auth";
import type { Contest } from "@/types/contest";

export function useReminders() {
  const [reminders, setReminders] = useState<
    Record<number, "1h" | "6h" | "24h">
  >({});
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser);

        if (!currentUser) {
          setReminders({});
          return;
        }

        const remindersRef = collection(
          db,
          "users",
          currentUser.uid,
          "reminders"
        );

        const snapshot = await getDocs(remindersRef);

        const loadedReminders: Record<
          number,
          "1h" | "6h" | "24h"
        > = {};

        snapshot.docs.forEach((doc) => {
          const data = doc.data();

          loadedReminders[
            Number(doc.id)
          ] = data.reminderType;
        });

        setReminders(loadedReminders);
      }
    );

    return unsubscribe;
  }, []);

  const addReminder = async (
    contest: Contest,
    reminderType: "1h" | "6h" | "24h"
  ) => {
    if (!user) {
      alert("Please login first.");
      return;
    }

    const reminderRef = doc(
      db,
      "users",
      user.uid,
      "reminders",
      contest.id.toString()
    );

    await setDoc(reminderRef, {
      contestId: contest.id,
      event: contest.event,
      host: contest.host,
      href: contest.href,
      start: contest.start,
      duration: contest.duration,
      reminderType,
      email: user.email,
      createdAt: new Date(),
    });

    toast.success(
      `Reminder set for ${reminderType} before contest`
    );

    setReminders(prev => ({
      ...prev,
      [contest.id]: reminderType,
    }));
  };

  const removeReminder = async (
    contestId: number
  ) => {
    if (!user) return;

    const reminderRef = doc(
      db,
      "users",
      user.uid,
      "reminders",
      contestId.toString()
    );

    await deleteDoc(reminderRef);

    setReminders(prev => {
      const updated = { ...prev };

      delete updated[contestId];

      return updated;
    });
  };

  return {
    reminders,
    addReminder,
    removeReminder,
  };
}