"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { browserSupabase } from "@/lib/supabase/browser";
import { accountUser, type AccountUser } from "@/features/auth/lib/user";
import { toast } from "sonner";

const AuthContext = createContext<{
  user: AccountUser | null;
  loading: boolean;
  busy: boolean;
  login: () => Promise<void>;
  reauthenticate: () => Promise<void>;
  logout: () => Promise<void>;
}>({
  user: null,
  loading: true,
  busy: false,
  login: async () => {},
  reauthenticate: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  useEffect(() => {
    let active = true;
    try {
      const client = browserSupabase();
      const apply = (current: User | null) => {
        if (!active) return;
        setUser(
          current
            ? accountUser(current, async () => {
                const { data, error } = await client.auth.getSession();
                if (
                  error ||
                  !data.session ||
                  data.session.user.id !== current.id
                )
                  throw new Error("Your session changed. Sign in again.");
                return data.session.access_token;
              })
            : null,
        );
        setLoading(false);
      };
      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((_event, session) =>
        apply(session?.user ?? null),
      );
      return () => {
        active = false;
        subscription.unsubscribe();
      };
    } catch {
      setLoading(false);
    }
    return () => {
      active = false;
    };
  }, []);

  async function startLogin(returnTo = "/") {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const { error } = await browserSupabase().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${returnTo}`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch {
      toast.error(
        "Sign-in couldn't start. Check the connection and try again.",
      );
      busyRef.current = false;
      setBusy(false);
    }
  }
  const login = () => startLogin();
  const reauthenticate = () => startLogin("/settings");
  async function logout() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const { error } = await browserSupabase().auth.signOut();
      if (error) throw error;
      toast.success("You're signed out.");
    } catch {
      toast.error("Couldn't sign out. Please try again.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  return (
    <AuthContext.Provider
      value={{ user, loading, busy, login, logout, reauthenticate }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
