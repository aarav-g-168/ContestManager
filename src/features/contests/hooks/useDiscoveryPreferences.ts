"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { useAccountPreferences } from "@/features/account/components/AccountPreferencesProvider";
import {
  DEFAULT_DISCOVERY,
  validateDiscovery,
  type DiscoveryPreferences,
} from "@/features/contests/lib/discovery";

const storageKey = "algolap-discovery-v1";
export function useDiscoveryPreferences() {
  const { user, loading: authLoading } = useAuth();
  const account = useAccountPreferences();
  const [guest, setGuest] = useState<DiscoveryPreferences | null>(null);
  useEffect(() => {
    function read() {
      try {
        const saved = localStorage.getItem(storageKey);
        setGuest(
          saved ? validateDiscovery(JSON.parse(saved)) : DEFAULT_DISCOVERY,
        );
      } catch {
        setGuest(DEFAULT_DISCOVERY);
      }
    }
    read();
    const update = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) read();
    };
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, []);
  return {
    owner: user?.uid ?? "guest",
    signedIn: !!user,
    preferences: user
      ? (account.data?.discovery ?? DEFAULT_DISCOVERY)
      : (guest ?? DEFAULT_DISCOVERY),
    loading: authLoading || (user ? account.loading : guest === null),
    error: user ? account.error : null,
    canSave: !user || (!!account.data && !account.data.deleting),
    refresh: account.refresh,
    async save(preferences: DiscoveryPreferences, expected?: string) {
      const clean = validateDiscovery(preferences);
      const current = user
        ? (account.data?.discovery ?? DEFAULT_DISCOVERY)
        : (guest ?? DEFAULT_DISCOVERY);
      if (expected !== undefined && expected !== JSON.stringify(current))
        throw new Error(
          "Your discovery preferences changed in another tab. Close this editor and reopen it before saving.",
        );
      if (user) {
        if (!account.data || account.data.deleting)
          throw new Error("Reload your account preferences before saving.");
        await account.save({ ...account.data, discovery: clean });
      } else {
        try {
          localStorage.setItem(storageKey, JSON.stringify(clean));
        } catch {
          throw new Error(
            "Your browser couldn’t save these choices. Allow site storage and try again.",
          );
        }
        setGuest(clean);
      }
    },
  };
}
