"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { ProgressSnapshot } from "@/lib/progress";
export function useProgress(months: number, platform: string) {
  const { user, loading: authLoading } = useAuth();
  const query = new URLSearchParams({ months: String(months), platform }).toString();
  const [state, setState] = useState<{ uid: string; query: string; data: ProgressSnapshot | null; error: string | null; refreshing: boolean } | null>(null);
  const generation = useRef(0);
  const lifetime = useRef<AbortController | null>(null);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!user) return;
    const scope = signal ?? lifetime.current?.signal;
    const id = ++generation.current;
    setState((old) => ({ uid: user.uid, query, data: old?.uid === user.uid ? old.data : null, error: null, refreshing: true }));
    try {
      const response = await fetch(`/api/progress?${query}`, { cache: "no-store", headers: { Authorization: `Bearer ${await user.getAccessToken()}` }, signal: scope ? AbortSignal.any([scope, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000) });
      const data = await response.json();
      if (scope?.aborted || id !== generation.current) return;
      if (!response.ok) {
        setState((old) => ({ uid: user.uid, query, data: [401,403].includes(response.status) ? null : old?.uid === user.uid ? old.data : null, error: data.error || "Your progress couldn’t refresh.", refreshing: false })); return;
      }
      setState({ uid: user.uid, query, data, error: null, refreshing: false });
    } catch {
      if (!scope?.aborted && id === generation.current) setState((old) => ({ uid: user.uid, query, data: old?.uid === user.uid ? old.data : null, error: "Your progress couldn’t refresh. Check your connection and try again.", refreshing: false }));
    }
  }, [user, query]);
  useEffect(() => {
    const controller = new AbortController(); lifetime.current = controller;
    void refresh(controller.signal);
    const update = () => { if (document.visibilityState === "visible") void refresh(controller.signal); };
    window.addEventListener("focus", update);
    const timer = window.setInterval(update, 60000);
    return () => { controller.abort(); window.removeEventListener("focus", update); window.clearInterval(timer); };
  }, [refresh]);
  const visible = user && state?.uid === user.uid ? state : null;
  return { data: visible?.data ?? null, error: visible?.error ?? null, refreshing: (visible?.refreshing ?? false) || (!!visible && visible.query !== query), loading: authLoading || (!!user && !visible), refresh };
}
