"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  busy: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}>({
  user: null,
  loading: true,
  busy: false,
  login: async () => {},
  logout: async () => {},
});
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  useEffect(
    () =>
      onAuthStateChanged(
        auth,
        (current) => {
          setUser(current);
          setLoading(false);
        },
        () => {
          setLoading(false);
          toast.error(
            "We couldn't check your session. Please try signing in again.",
          );
        },
      ),
    [],
  );
  async function login() {
    if (busy) return;
    setBusy(true);
    try {
      const { user: current } = await signInWithPopup(
        auth,
        new GoogleAuthProvider(),
      );
      toast.success(
        `Welcome, ${current.displayName?.split(" ")[0] || "coder"}.`,
      );
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (
        code !== "auth/popup-closed-by-user" &&
        code !== "auth/cancelled-popup-request"
      )
        toast.error(
          "Sign-in didn't finish. Please allow popups and try again.",
        );
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      await signOut(auth);
      toast.success("You're signed out.");
    } catch {
      toast.error("Couldn't sign out. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthContext.Provider value={{ user, loading, busy, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
