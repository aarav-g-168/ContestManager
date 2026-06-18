"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";

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
  const [reminders, setReminders] = useState<number[]>([]);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser);

        if (!currentUser) {
          setReminders([]);
          return;
        }

        const remindersRef = collection(
          db,
          "users",
          currentUser.uid,
          "reminders"
        );

        const snapshot = await getDocs(remindersRef);

        setReminders(
          snapshot.docs.map((doc) =>
            Number(doc.id)
          )
        );
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
      createdAt: new Date(),
    });

    setReminders((prev) => [
      ...prev,
      contest.id,
    ]);
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

    setReminders((prev) =>
      prev.filter((id) => id !== contestId)
    );
  };

  return {
    reminders,
    addReminder,
    removeReminder,
  };
}