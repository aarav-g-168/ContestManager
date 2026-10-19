"use client";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { accountRequest } from "@/features/auth/lib/client-api";
import { useAccountCollection } from "@/features/auth/hooks/useAccountCollection";
import type { Contest } from "@/features/contests/types";
import { toast } from "sonner";
const empty = { ids: [] as number[] };
export function useBookmarks() {
  const { user, login } = useAuth();
  const state = useAccountCollection("/api/bookmarks", empty);
  async function toggleBookmark(contest: Contest) {
    if (!user) {
      toast("Sign in to bookmark contests.", {
        action: { label: "Sign in", onClick: login },
      });
      return;
    }
    const removing = state.value.ids.includes(contest.id);
    try {
      await accountRequest(
        user,
        removing ? `/api/bookmarks?contestId=${contest.id}` : "/api/bookmarks",
        {
          method: removing ? "DELETE" : "PUT",
          ...(removing
            ? {}
            : { body: JSON.stringify({ contestId: contest.id }) }),
        },
      );
      await state.reload();
      toast.success(removing ? "Bookmark removed." : "Contest bookmarked.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't update your bookmark.",
      );
    }
  }
  return {
    bookmarkedContests: state.value.ids,
    toggleBookmark,
    loading: state.loading,
    error: state.error,
  };
}
