"use client";

import { useEffect, useState } from "react";

export function useBookmarks() {
  const [bookmarkedContests, setBookmarkedContests] = useState<number[]>([]);

  // Load bookmarks
  useEffect(() => {
    const savedBookmarks = localStorage.getItem("bookmarkedContests");

    if (savedBookmarks) {
      setBookmarkedContests(JSON.parse(savedBookmarks));
    }
  }, []);

  // Toggle bookmark
  const toggleBookmark = (contestId: number) => {
    const updatedBookmarks = bookmarkedContests.includes(contestId)
      ? bookmarkedContests.filter(id => id !== contestId)
      : [...bookmarkedContests, contestId];

    setBookmarkedContests(updatedBookmarks);

    localStorage.setItem(
      "bookmarkedContests",
      JSON.stringify(updatedBookmarks)
    );
  };

  return {
    bookmarkedContests,
    toggleBookmark,
  };
}