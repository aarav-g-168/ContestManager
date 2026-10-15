"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { WeekPlan } from "@/lib/week";

export function useWeekPlan() {
  const { user, loading } = useAuth();
  const [saved, setSaved] = useState<{
    uid: string;
    data: WeekPlan | null;
    error: string | null;
    refreshing: boolean;
  } | null>(null);
  const requestId = useRef(0);
  const lifetime = useRef<AbortController | null>(null);
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (!user) return;
      const scope = signal ?? lifetime.current?.signal;
      const id = ++requestId.current;
      setSaved((previous) => ({
        uid: user.uid,
        data: previous?.uid === user.uid ? previous.data : null,
        error: null,
        refreshing: true,
      }));
      try {
        const response = await fetch("/api/week", {
          headers: { Authorization: `Bearer ${await user.getAccessToken()}` },
          cache: "no-store",
          signal: scope
            ? AbortSignal.any([scope, AbortSignal.timeout(20000)])
            : AbortSignal.timeout(20000),
        });
        const data = await response.json();
        if (scope?.aborted || requestId.current !== id) return;
        if (!response.ok) {
          setSaved((previous) => ({
            uid: user.uid,
            data: [401, 403].includes(response.status)
              ? null
              : previous?.uid === user.uid
                ? previous.data
                : null,
            error: data.error || "Your week couldn’t be refreshed.",
            refreshing: false,
          }));
          return;
        }
        setSaved({ uid: user.uid, data, error: null, refreshing: false });
      } catch {
        if (!scope?.aborted && requestId.current === id)
          setSaved((previous) => ({
            uid: user.uid,
            data: previous?.uid === user.uid ? previous.data : null,
            error:
              "Your week couldn’t be refreshed. Check your connection and try again.",
            refreshing: false,
          }));
      }
    },
    [user],
  );
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    void refresh(controller.signal);
    const update = () => {
      if (document.visibilityState === "visible")
        void refresh(controller.signal);
    };
    const timer = window.setInterval(update, 60000);
    window.addEventListener("focus", update);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, [refresh]);
  const current = user && saved?.uid === user.uid ? saved : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    refreshing: current?.refreshing ?? false,
    loading: loading || (!!user && !current),
    refresh,
  };
}
