"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useAuth } from "@/features/auth/components/AuthProvider";
import type {
  AccountSettings,
  SettingsValues,
} from "@/features/account/lib/settings";
type State = {
  data: AccountSettings | null;
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  save: (values: SettingsValues) => Promise<void>;
};
const Context = createContext<State>({
  data: null,
  error: null,
  loading: false,
  refresh: async () => {},
  save: async () => {},
});
export class SettingsSaveError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export function AccountPreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<{
    uid: string;
    data: AccountSettings | null;
    error: string | null;
  } | null>(null);
  const generation = useRef(0),
    lifetime = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    if (!user) return;
    const id = ++generation.current,
      scope = lifetime.current?.signal;
    try {
      const response = await fetch("/api/account/settings", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${await user.getAccessToken()}` },
        signal: scope
          ? AbortSignal.any([scope, AbortSignal.timeout(15000)])
          : AbortSignal.timeout(15000),
      });
      const data = await response.json();
      if (scope?.aborted || id !== generation.current) return;
      if (!response.ok)
        throw new SettingsSaveError(
          data.error || "Preferences couldn’t load.",
          response.status,
        );
      setState({ uid: user.uid, data, error: null });
    } catch (e) {
      if (scope?.aborted || id !== generation.current) return;
      setState((old) => ({
        uid: user.uid,
        data:
          e instanceof SettingsSaveError && [401, 403].includes(e.status)
            ? null
            : old?.uid === user.uid
              ? old.data
              : null,
        error: e instanceof Error ? e.message : "Preferences couldn’t load.",
      }));
    }
  }, [user]);
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    void refresh();
    const update = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = window.setInterval(update, 60000);
    window.addEventListener("focus", update);
    window.addEventListener("account-data-changed", update);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      window.removeEventListener("account-data-changed", update);
    };
  }, [refresh]);
  async function save(values: SettingsValues) {
    if (!user)
      throw new SettingsSaveError("Sign in to update preferences.", 401);
    const scope = lifetime.current?.signal;
    const response = await fetch("/api/account/settings", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${await user.getAccessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
      signal: scope
        ? AbortSignal.any([scope, AbortSignal.timeout(20000)])
        : AbortSignal.timeout(20000),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new SettingsSaveError(
        data.error || "Preferences couldn’t be saved.",
        response.status,
      );
    }
    if (scope?.aborted) return;
    generation.current++;
    setState({ uid: user.uid, data, error: null });
    window.dispatchEvent(new Event("account-data-changed"));
  }
  const visible = user && state?.uid === user.uid ? state : null;
  return (
    <Context.Provider
      value={{
        data: visible?.data ?? null,
        error: visible?.error ?? null,
        loading: authLoading || (!!user && !visible),
        refresh,
        save,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useAccountPreferences = () => useContext(Context);
