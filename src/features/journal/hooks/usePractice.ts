"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { JournalApiError } from "@/features/journal/hooks/useJournal";
import type {
  PracticeItem,
  PracticeSnapshot,
  PracticeUpdate,
} from "@/features/journal/lib/practice";

export function usePractice(query: string) {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<{
    uid: string;
    query: string;
    data: PracticeSnapshot | null;
    error: string | null;
    pending: boolean;
  } | null>(null);
  const generation = useRef(0);
  const lifetime = useRef<AbortController | null>(null);
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (!user) return;
      const scope = signal ?? lifetime.current?.signal;
      const id = ++generation.current;
      setState((old) => ({
        uid: user.uid,
        query,
        data: old?.uid === user.uid ? old.data : null,
        error: null,
        pending: true,
      }));
      try {
        const response = await fetch(`/api/journal/practice?${query}`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${await user.getAccessToken()}` },
          signal: scope
            ? AbortSignal.any([scope, AbortSignal.timeout(20000)])
            : AbortSignal.timeout(20000),
        });
        const data = await response.json();
        if (scope?.aborted || id !== generation.current) return;
        if (!response.ok)
          throw new JournalApiError(
            data.error || "Your practice queue couldn’t load.",
            response.status,
          );
        setState({ uid: user.uid, query, data, error: null, pending: false });
      } catch (error) {
        if (scope?.aborted || id !== generation.current) return;
        setState((old) => ({
          uid: user.uid,
          query,
          data:
            error instanceof JournalApiError &&
            [401, 403].includes(error.status)
              ? null
              : old?.uid === user.uid
                ? old.data
                : null,
          error:
            error instanceof Error
              ? error.message
              : "Your queue couldn’t load.",
          pending: false,
        }));
      }
    },
    [user, query],
  );
  const latestRefresh = useRef(refresh);
  useEffect(() => {
    latestRefresh.current = refresh;
  }, [refresh]);
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    const timer = window.setTimeout(() => void refresh(controller.signal), 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [refresh]);
  async function save(item: PracticeItem, problem: PracticeUpdate) {
    if (!user) throw new JournalApiError("Sign in to save your practice.", 401);
    const response = await fetch("/api/journal/practice", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await user.getAccessToken()}`,
      },
      body: JSON.stringify({
        id: item.entryId,
        revision: item.revision,
        problemId: item.problem.id,
        problem,
      }),
      signal: AbortSignal.timeout(20000),
    });
    const data = await response.json();
    if (!response.ok) {
      if ([401, 403, 409].includes(response.status))
        await latestRefresh.current();
      throw new JournalApiError(
        response.status === 409
          ? "The latest entry has been loaded. Your draft is kept; review it and save again."
          : data.error || "Your practice details couldn’t be saved.",
        response.status,
      );
    }
    // Update the entire entry's revision, since several queue rows can share it.
    setState((old) =>
      old?.uid === user.uid && old.data
        ? {
            ...old,
            data: {
              ...old.data,
              items: old.data.items.map((row) =>
                row.entryId === item.entryId
                  ? {
                      ...row,
                      revision: data.revision,
                      problem:
                        row.problem.id === item.problem.id
                          ? data.problem
                          : row.problem,
                    }
                  : row,
              ),
            },
          }
        : old,
    );
    await latestRefresh.current();
  }
  const visible = user && state?.uid === user.uid ? state : null;
  return {
    data: visible?.data ?? null,
    error: visible?.error ?? null,
    pending:
      (visible?.pending ?? false) || (!!visible && visible.query !== query),
    loading:
      authLoading ||
      (!!user && (!visible || (!visible.data && !visible.error))),
    refresh,
    save,
  };
}
