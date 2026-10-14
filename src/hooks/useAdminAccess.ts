"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
export function useAdminAccess() {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/admin/access", { headers: { Authorization: `Bearer ${await user.getAccessToken()}` }, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]), cache: "no-store" });
        if (!controller.signal.aborted) setAllowed(response.ok ? user.uid : null);
      } catch { if (!controller.signal.aborted) setAllowed(null); }
    })();
    return () => controller.abort();
  }, [user]);
  return !!user && allowed === user.uid;
}
