"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
} from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";
import type { Contest } from "@/types/contest";
import { toast } from "sonner";
export function useBookmarks() {
  const { user, loading: authLoading, login } = useAuth();
  const [saved, setSaved] = useState<{ uid: string; ids: number[] } | null>(
    null,
  );
  const [error, setError] = useState(false);
  useEffect(() => {
    setError(false);
    if (!user) {
      setSaved(null);
      return;
    }
    return onSnapshot(
      collection(db, "users", user.uid, "bookmarks"),
      (snapshot) => {
        setSaved({
          uid: user.uid,
          ids: snapshot.docs.map((item) => Number(item.id)),
        });
      },
      () => {
        setError(true);
        setSaved({ uid: user.uid, ids: [] });
      },
    );
  }, [user]);
  const bookmarkedContests = saved?.uid === user?.uid ? (saved?.ids ?? []) : [];
  async function toggleBookmark(contest: Contest) {
    if (!user) {
      toast("Sign in to bookmark contests.", {
        action: { label: "Sign in", onClick: login },
      });
      return;
    }
    const reference = doc(
      db,
      "users",
      user.uid,
      "bookmarks",
      String(contest.id),
    );
    try {
      if (bookmarkedContests.includes(contest.id)) {
        await deleteDoc(reference);
        toast.success("Bookmark removed.");
      } else {
        await setDoc(reference, {
          contestId: contest.id,
          event: contest.event,
          host: contest.host,
          href: contest.href,
          start: contest.start,
          duration: contest.duration,
          createdAt: new Date(),
        });
        toast.success("Contest bookmarked.");
      }
    } catch {
      toast.error("Couldn't update your bookmark. Please try again.");
    }
  }
  return {
    bookmarkedContests,
    toggleBookmark,
    loading: authLoading || (!!user && saved?.uid !== user.uid),
    error,
  };
}
