"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { accountRequest } from "@/features/auth/lib/client-api";

export function useAccountCollection<T>(path: string, empty: T) {
  const { user, loading: authLoading } = useAuth();
  const [saved, setSaved] = useState<{
    uid: string;
    value: T;
    error: boolean;
  } | null>(null);
  const currentUid = useRef(user?.uid);
  useEffect(() => {
    currentUid.current = user?.uid;
  }, [user?.uid]);
  const reload = useCallback(
    async (signal?: AbortSignal) => {
      if (!user) return;
      try {
        const value = await accountRequest<T>(user, path, { signal });
        if (!signal?.aborted && currentUid.current === user.uid)
          setSaved({ uid: user.uid, value, error: false });
      } catch {
        if (!signal?.aborted && currentUid.current === user.uid)
          setSaved({ uid: user.uid, value: empty, error: true });
      }
    },
    [user, path, empty],
  );
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    void reload(controller.signal);
    const refresh = () => {
      if (document.visibilityState === "visible")
        void reload(controller.signal);
    };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [user, reload]);
  const visible = saved?.uid === user?.uid ? saved : null;
  return {
    value: visible?.value ?? empty,
    error: visible?.error ?? false,
    loading: authLoading || (!!user && !visible),
    reload,
  };
}
