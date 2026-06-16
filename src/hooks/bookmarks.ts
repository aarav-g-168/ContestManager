"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";

import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
} from "firebase/firestore";

import { onAuthStateChanged, User } from "firebase/auth";

export function useBookmarks() {
  const [bookmarkedContests, setBookmarkedContests] = useState<number[]>([]);
  const [user, setUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    setUser(currentUser);

    if (!currentUser) {
      setBookmarkedContests([]);
      setLoading(false);
      return;
    }

    try {
      const bookmarksRef = collection(
        db,
        "users",
        currentUser.uid,
        "bookmarks"
      );

      const snapshot = await getDocs(bookmarksRef);

      const bookmarks = snapshot.docs.map(doc =>
        Number(doc.id)
      );

      setBookmarkedContests(bookmarks);

    } catch (error) {
      console.error("Error fetching bookmarks:", error);
    }

    setLoading(false);
  });

  return () => unsubscribe();
}, []);

  // Toggle bookmark
  const toggleBookmark = async (contestId: number) => {
    if (!user) {
      alert("Please login to bookmark contests.");
      return;
    }

    const bookmarkRef = doc(
      db,
      "users",
      user.uid,
      "bookmarks",
      contestId.toString()
    );

    try {
      if (bookmarkedContests.includes(contestId)) {
        await deleteDoc(bookmarkRef);
        setBookmarkedContests(prev =>
          prev.filter(id => id !== contestId)
        );
      } else {
        await setDoc(bookmarkRef, {
          contestId,
          createdAt: new Date(),
        });

        setBookmarkedContests(prev => [
          ...prev,
          contestId,
        ]);
      }
    } catch (error) {
      console.error("Bookmark Error:", error);
    }
  };

  return {
    bookmarkedContests,
    toggleBookmark,
    loading,
  };
}