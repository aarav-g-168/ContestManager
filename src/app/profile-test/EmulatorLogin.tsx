"use client";
import { useState, type FormEvent } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

export default function EmulatorLogin() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      await signInWithEmailAndPassword(auth, String(form.get("email")), String(form.get("password")));
      router.replace("/profile");
    } catch { setError("Use an account created in the local Auth emulator."); }
    finally { setBusy(false); }
  }
  return <div className="site-container py-12"><form onSubmit={submit} className="profile-section surface mx-auto max-w-md"><h1 className="text-2xl font-medium">Profile test preview</h1><p className="profile-helper my-4">Local Firebase emulators only. No production account is used.</p><div className="profile-fields-grid !grid-cols-1"><div className="profile-field"><label htmlFor="test-email">Emulator email</label><input id="test-email" name="email" type="email" required autoComplete="off" /></div><div className="profile-field"><label htmlFor="test-password">Emulator password</label><input id="test-password" name="password" type="password" required autoComplete="off" /></div></div>{error && <p className="profile-field-error" role="alert">{error}</p>}<button disabled={busy} className="btn-primary mt-5">{busy ? "Signing in…" : "Sign in to emulator"}</button></form></div>;
}
