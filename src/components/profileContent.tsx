"use client";

import { useEffect, useState } from "react";

import { auth, db } from "@/lib/firebase";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import {
  onAuthStateChanged,
  User,
} from "firebase/auth";

import Navbar from "./Navbar";

export default function ProfileContent() {
  const [user, setUser] = useState<User | null>(null);

  const [bookmarkCount, setBookmarkCount] =
    useState(0);

  const [reminderCount, setReminderCount] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser);

        if (!currentUser) {
          setLoading(false);
          return;
        }

        const bookmarksSnapshot =
          await getDocs(
            collection(
              db,
              "users",
              currentUser.uid,
              "bookmarks"
            )
          );

        const remindersSnapshot =
          await getDocs(
            collection(
              db,
              "users",
              currentUser.uid,
              "reminders"
            )
          );

        setBookmarkCount(
          bookmarksSnapshot.size
        );

        setReminderCount(
          remindersSnapshot.size
        );

        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-300 dark:bg-black">
        <Navbar />
        <p className="text-center mt-20 text-white">
          Loading...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-300 dark:bg-black">
        <Navbar />
        <p className="text-center font-bold text-5xl mt-20 text-black dark:text-white">
          Please login first.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
    <Navbar />
    <div className="container mx-auto px-4 py-8">

        {/* Profile Header */}
        <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-800 p-8 shadow-xl">
            <div className="flex flex-col md:flex-row items-center gap-6">

                <img
                src={user.photoURL ?? "/default-avatar.png"}
                alt="Profile"
                className="h-28 w-28 rounded-full border-4 border-indigo-500 object-cover"
                />

                <div className="text-center md:text-left">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
                    {user.displayName}
                </h2>

                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    {user.email}
                </p>

                <p className="text-sm text-indigo-500 mt-2">
                    Competitive Programmer
                </p>
                </div>

            </div>

            {/* Divider */}
            <div className="h-px bg-gray-200 dark:bg-zinc-800 my-8" />

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                <a
                href="/bookmarks"
                className="group rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/20"
                >
                <p className="text-2xl mb-2">📌</p>

                <p className="text-4xl font-bold">
                    {bookmarkCount}
                </p>

                <p className="opacity-90">
                    Saved Contests
                </p>
                </a>

                <a
                href="/reminders"
                className="group rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 p-6 text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/20"
                >
                <p className="text-2xl mb-2">🔔</p>

                <p className="text-4xl font-bold">
                    {reminderCount}
                </p>

                <p className="opacity-90">
                    Active Reminders
                </p>
                </a>

            </div>

            {/* Divider */}
            <div className="h-px bg-gray-200 dark:bg-zinc-800 my-8" />

            {/* Quick Actions */}
            <div>

                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                Quick Actions
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <a
                    href="/bookmarks"
                    className="rounded-xl border border-gray-200 dark:border-zinc-800 p-4 hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all"
                >
                    📌 View Bookmarks
                </a>

                <a
                    href="/reminders"
                    className="rounded-xl border border-gray-200 dark:border-zinc-800 p-4 hover:border-purple-500 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all"
                >
                    🔔 View Reminders
                </a>

                <a
                    href="/contests"
                    className="rounded-xl border border-gray-200 dark:border-zinc-800 p-4 hover:border-green-500 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all"
                >
                    📅 Browse Contests
                </a>

                </div>
                </div>
            </div>
        </div>
    </div>
  );
}