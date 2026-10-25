"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/features/auth/components/AuthProvider";
import type { FeedbackMessage } from "@/features/support/lib/contact";
import "@/features/account/styles.css";
export default function AdminFeedback() {
  const { user } = useAuth();
  const [rows, setRows] = useState<FeedbackMessage[]>([]),
    [status, setStatus] = useState("open"),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (!user) return;
      setBusy(true);
      try {
        const response = await fetch(`/api/admin/feedback?status=${status}`, {
          headers: { Authorization: `Bearer ${await user.getAccessToken()}` },
          signal: signal ?? AbortSignal.timeout(15000),
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!signal?.aborted) {
          setRows(data);
          setError(null);
        }
      } catch (e) {
        if (!signal?.aborted)
          setError(e instanceof Error ? e.message : "Inbox unavailable.");
      } finally {
        if (!signal?.aborted) setBusy(false);
      }
    },
    [user, status],
  );
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);
  return (
    <section className="account-panel" aria-label="Private feedback inbox">
      <h2>Feedback inbox</h2>
      <p>
        Only administrators can read this inbox. Showing the latest 50 messages
        in this view.
      </p>
      <div className="account-actions">
        <label className="account-field">
          <span>Message status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
        </label>
        <button
          className="btn-secondary"
          disabled={busy}
          onClick={() => void refresh()}
        >
          Refresh inbox
        </button>
      </div>
      {error && (
        <p className="account-error" role="alert">
          {error}
        </p>
      )}
      <div className="support-history" aria-busy={busy}>
        {rows.map((row) => (
          <article className="support-message" key={row.id}>
            <small>
              {row.email ?? "Account email unavailable"} · {row.category} ·{" "}
              {new Date(row.createdAt).toLocaleString("en-GB")}
            </small>
            <h3>{row.subject}</h3>
            <p>{row.message}</p>
            <button
              className="btn-secondary"
              disabled={busy}
              onClick={async () => {
                if (!user) return;
                setBusy(true);
                try {
                  const response = await fetch("/api/admin/feedback", {
                    method: "PATCH",
                    headers: {
                      Authorization: `Bearer ${await user.getAccessToken()}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      id: row.id,
                      status: status === "open" ? "resolved" : "open",
                    }),
                  });
                  const data = await response.json();
                  if (!response.ok) throw new Error(data.error);
                  await refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Update failed.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {status === "open" ? "Mark resolved" : "Reopen"}
            </button>
          </article>
        ))}
        {!busy && !rows.length && !error && <p>No {status} messages.</p>}
      </div>
    </section>
  );
}
