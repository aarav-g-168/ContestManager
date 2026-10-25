"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/components/AuthProvider";
import type {
  WeeklyGoalsSnapshot,
  GoalTargets,
} from "@/features/goals/lib/goals";
export class GoalsSaveError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export type GoalsMutation = GoalTargets & {
  weekStart: string;
  revision: number | null;
};
export function useWeeklyGoals() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<{
    uid: string;
    data: WeeklyGoalsSnapshot | null;
    error: string | null;
    pending: boolean;
  } | null>(null);
  const generation = useRef(0),
    lifetime = useRef<AbortController | null>(null);
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (!user) return;
      const scope = signal ?? lifetime.current?.signal,
        id = ++generation.current;
      setState((old) => ({
        uid: user.uid,
        data: old?.uid === user.uid ? old.data : null,
        error: null,
        pending: true,
      }));
      try {
        const response = await fetch("/api/goals", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${await user.getAccessToken()}` },
          signal: scope
            ? AbortSignal.any([scope, AbortSignal.timeout(20000)])
            : AbortSignal.timeout(20000),
        });
        const data = await response.json();
        if (scope?.aborted || id !== generation.current) return;
        if (!response.ok)
          throw new GoalsSaveError(
            data.error || "Your weekly goals couldn’t load.",
            response.status,
          );
        setState({ uid: user.uid, data, error: null, pending: false });
      } catch (error) {
        if (scope?.aborted || id !== generation.current) return;
        setState((old) => ({
          uid: user.uid,
          data:
            error instanceof GoalsSaveError && [401, 403].includes(error.status)
              ? null
              : old?.uid === user.uid
                ? old.data
                : null,
          error:
            error instanceof Error
              ? error.message
              : "Your weekly goals couldn’t load.",
          pending: false,
        }));
      }
    },
    [user],
  );
  const latestRefresh = useRef(refresh);
  useEffect(() => {
    latestRefresh.current = refresh;
  }, [refresh]);
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
  async function save(input: GoalsMutation) {
    if (!user) throw new GoalsSaveError("Sign in to save weekly goals.", 401);
    const scope = lifetime.current?.signal;
    const response = await fetch("/api/goals", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await user.getAccessToken()}`,
      },
      body: JSON.stringify(input),
      signal: scope
        ? AbortSignal.any([scope, AbortSignal.timeout(20000)])
        : AbortSignal.timeout(20000),
    });
    const data = await response.json();
    if (!response.ok) {
      if ([401, 403, 409].includes(response.status))
        await latestRefresh.current();
      throw new GoalsSaveError(
        data.error || "Your weekly goals couldn’t be saved.",
        response.status,
      );
    }
    if (scope?.aborted) return;
    ++generation.current;
    setState({ uid: user.uid, data, error: null, pending: false });
  }
  const visible = user && state?.uid === user.uid ? state : null;
  return {
    data: visible?.data ?? null,
    error: visible?.error ?? null,
    pending: visible?.pending ?? false,
    loading:
      authLoading ||
      (!!user && (!visible || (!visible.data && !visible.error))),
    refresh,
    save,
  };
}
