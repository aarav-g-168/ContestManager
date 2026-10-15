"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import type {
  JournalEntry,
  JournalSnapshot,
  JournalValues,
} from "@/lib/journal";
export class JournalApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}
export function useJournal(query: string) {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<{
    uid: string;
    query: string;
    data: JournalSnapshot | null;
    error: string | null;
    refreshing: boolean;
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
        refreshing: true,
      }));
      try {
        const response = await fetch(`/api/journal?${query}`, {
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
            data.error || "Your journal couldn’t load.",
            response.status,
          );
        setState({
          uid: user.uid,
          query,
          data,
          error: null,
          refreshing: false,
        });
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
              : "Your journal couldn’t load. Try again.",
          refreshing: false,
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
  async function save(values: JournalValues, existing: JournalEntry | null) {
    if (!user) throw new JournalApiError("Sign in to save an entry.", 401);
    const response = await fetch("/api/journal", {
      method: existing ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await user.getAccessToken()}`,
      },
      body: JSON.stringify({
        values,
        ...(existing ? { id: existing.id, revision: existing.revision } : {}),
      }),
      signal: AbortSignal.timeout(20000),
    });
    const data = await response.json();
    if (!response.ok)
      throw new JournalApiError(
        data.error || "Your entry couldn’t be saved.",
        response.status,
        data.fields,
      );
    await latestRefresh.current();
    return data as JournalEntry;
  }
  const visible = user && state?.uid === user.uid ? state : null;
  return {
    data: visible?.data ?? null,
    error: visible?.error ?? null,
    refreshing:
      (visible?.refreshing ?? false) || (!!visible && visible.query !== query),
    loading:
      authLoading ||
      (!!user && (!visible || (!visible.data && !visible.error))),
    refresh,
    save,
  };
}
