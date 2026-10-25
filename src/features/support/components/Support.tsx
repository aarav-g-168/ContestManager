"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/components/AuthProvider";
import AuthButton from "@/features/auth/components/AuthButton";
import {
  SUPPORT_EMAIL,
  FEEDBACK_CATEGORIES,
  type FeedbackMessage,
} from "@/features/support/lib/contact";
import AccountSkeleton from "@/features/account/components/AccountSkeleton";
import "@/features/account/styles.css";
export function SupportForm({
  onSubmit,
}: {
  onSubmit: (values: {
    category: string;
    subject: string;
    message: string;
  }) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [sent, setSent] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget,
          values = new FormData(form);
        setBusy(true);
        setError(null);
        setSent(false);
        try {
          await onSubmit({
            category: String(values.get("category")),
            subject: String(values.get("subject")),
            message: String(values.get("message")),
          });
          form.reset();
          setSent(true);
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Your message couldn’t be saved.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>
        <label className="account-field">
          <span>What can we help with?</span>
          <select name="category">
            {FEEDBACK_CATEGORIES.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="account-field">
          <span>Subject</span>
          <input name="subject" required maxLength={120} />
        </label>
        <label className="account-field">
          <span>Your message</span>
          <textarea name="message" required maxLength={3000} rows={6} />
          <small>
            Include what happened and what you expected. Don’t include
            passwords, API keys or payment details. Up to five messages per day.
          </small>
        </label>
        {error && (
          <p className="account-error" role="alert">
            {error}
          </p>
        )}
        {sent && (
          <p role="status">
            Message saved. You can track its status below. There is no
            guaranteed response time.
          </p>
        )}
        <button className="btn-primary" disabled={busy}>
          {busy ? "Sending…" : "Send private feedback"}
        </button>
      </fieldset>
    </form>
  );
}
export default function Support() {
  const { user, loading } = useAuth();
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<{
      uid: string;
      rows: FeedbackMessage[];
    } | null>(null),
    [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/feedback", {
          headers: { Authorization: `Bearer ${await user.getAccessToken()}` },
          signal: controller.signal,
          cache: "no-store",
        });
        const rows = await response.json();
        if (!response.ok) throw new Error(rows.error);
        if (!controller.signal.aborted) {
          setState({ uid: user.uid, rows });
          setError(null);
        }
      } catch (e) {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Feedback history unavailable.",
          );
      }
    })();
    return () => controller.abort();
  }, [user, reload]);
  return (
    <div className="site-container account-page">
      <header className="account-heading">
        <p className="eyebrow">HERE TO HELP</p>
        <h1>
          Help & feedback<span>.</span>
        </h1>
        <p>Found a bug, missed a reminder, or have an idea? Tell us.</p>
      </header>
      <section className="account-panel">
        <h2>Contact Aarav</h2>
        <p>
          Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> for
          account access or deletion problems. In-app feedback is visible only
          to you and the administrator. Replies, when needed, go to your account
          email.
        </p>
        <p>
          For a missing reminder, include the contest name and expected time.
          Avoid sharing private account information in public GitHub issues.
        </p>
        <Link href="/settings" className="text-link">
          Reminder settings & data downloads →
        </Link>
      </section>
      <section className="account-panel">
        <h2>Send a message</h2>
        {loading ? (
          <AccountSkeleton contained label="Loading feedback form" />
        ) : user ? (
          <SupportForm
            key={user.uid}
            onSubmit={async (values) => {
              const response = await fetch("/api/feedback", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${await user.getAccessToken()}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(values),
                signal: AbortSignal.timeout(20000),
              });
              const data = await response.json();
              if (!response.ok) throw new Error(data.error);
              const row = {
                ...values,
                id: data.id,
                status: data.status,
                createdAt: new Date().toISOString(),
              };
              setState((old) => ({
                uid: user.uid,
                rows: [row, ...(old?.uid === user.uid ? old.rows : [])],
              }));
            }}
          />
        ) : (
          <>
            <p>
              Sign in to send private feedback, or use the email address above.
            </p>
            <AuthButton expanded />
          </>
        )}
      </section>
      {user && (
        <section className="account-panel">
          <h2>Your recent messages</h2>
          {error && (
            <p role="alert">
              {error}{" "}
              <button
                className="text-link"
                onClick={() => setReload((value) => value + 1)}
              >
                Retry history
              </button>
            </p>
          )}
          <div className="support-history">
            {state?.uid === user.uid ? (
              state.rows.length ? (
                state.rows.map((row) => (
                  <article className="support-message" key={row.id}>
                    <small>
                      {row.category} · {row.status} ·{" "}
                      {new Date(row.createdAt).toLocaleDateString("en-GB")}
                    </small>
                    <h3>{row.subject}</h3>
                    <p>{row.message}</p>
                  </article>
                ))
              ) : (
                <p>No messages yet.</p>
              )
            ) : error ? null : (
              <p role="status">Loading messages…</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
