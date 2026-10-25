"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Dialog } from "radix-ui";
import {
  Download,
  ShieldCheck,
  Bell,
  Trash2,
  X,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/features/auth/components/AuthProvider";
import AuthButton from "@/features/auth/components/AuthButton";
import { useAccountPreferences } from "@/features/account/components/AccountPreferencesProvider";
import AccountSkeleton from "@/features/account/components/AccountSkeleton";
import {
  REMINDER_OPTIONS,
  reminderTimeLabel,
  type ReminderType,
} from "@/features/reminders/lib/timing";
import type {
  AccountSettings as Settings,
  SettingsValues,
} from "@/features/account/lib/settings";
import { toast } from "sonner";
import "@/features/account/styles.css";
const receiptKey = "contest-manager-deletion-receipt";
type Props = {
  data: Settings;
  error: string | null;
  onRefresh: () => void;
  onSave: (values: SettingsValues) => Promise<void>;
  onExport: (format: string) => Promise<void>;
  onDelete: () => void;
  onReauthenticate: () => void;
};
export function AccountSettingsView({
  data,
  error,
  onRefresh,
  onSave,
  onExport,
  onDelete,
  onReauthenticate,
}: Props) {
  const [draft, setDraft] = useState<SettingsValues>({ ...data }),
    [busy, setBusy] = useState(false),
    [saveError, setSaveError] = useState<string | null>(null);
  return (
    <div className="site-container account-page">
      <header className="account-heading">
        <p className="eyebrow">YOUR ACCOUNT</p>
        <h1>
          Settings & privacy<span>.</span>
        </h1>
        <p>Your reminders, your data, your choice.</p>
      </header>
      {error && (
        <div className="account-notice" role="alert">
          {error}
          <button className="text-link" onClick={onRefresh}>
            Retry
          </button>
        </div>
      )}
      {data.deleting ? (
        <section className="account-panel">
          <h2>Deletion is in progress</h2>
          <p>
            New account changes are disabled while we stop pending emails and
            remove your data. Keep your deletion receipt in this browser, or{" "}
            <Link href="/support">contact support</Link> if you need help.
          </p>
        </section>
      ) : (
        <>
          <section
            className="account-panel"
            aria-labelledby="reminder-preferences-title"
          >
            <div className="account-section-heading">
              <h2 id="reminder-preferences-title">
                <Bell size={21} aria-hidden="true" />
                Reminder preferences
              </h2>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setSaveError(null);
                try {
                  await onSave(draft);
                  toast.success("Preferences saved.");
                } catch (err) {
                  setSaveError(
                    err instanceof Error
                      ? err.message
                      : "Preferences couldn’t be saved.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <fieldset disabled={busy}>
                <label className="account-field">
                  <span>Default reminder</span>
                  <select
                    value={draft.defaultReminder}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        defaultReminder: e.target.value as ReminderType,
                      })
                    }
                  >
                    {REMINDER_OPTIONS.map((type) => (
                      <option key={type} value={type}>
                        {reminderTimeLabel(type)} before
                      </option>
                    ))}
                  </select>
                  <small>
                    Your default appears first in each contest’s reminder menu.
                    Existing reminders keep their saved timing.
                  </small>
                </label>
                <label className="account-check">
                  <input
                    type="checkbox"
                    checked={draft.remindersPaused}
                    onChange={(e) =>
                      setDraft({ ...draft, remindersPaused: e.target.checked })
                    }
                  />
                  <span>Pause all email reminders</span>
                </label>
                <p className="account-help">
                  Pausing requests cancellation of existing reminders and
                  prevents new ones. Emails already sent can’t be recalled.
                  Resuming lets you create reminders again; it doesn’t restore
                  cancelled ones.
                </p>
                <label className="account-check">
                  <input
                    type="checkbox"
                    checked={!draft.onboardingDismissed}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        onboardingDismissed: !e.target.checked,
                      })
                    }
                  />
                  <span>Show the getting-started checklist</span>
                </label>
                {saveError && (
                  <p className="account-error" role="alert">
                    {saveError} Your selections are kept. Refresh the saved
                    preferences before retrying a conflict.{" "}
                    <button
                      type="button"
                      className="text-link"
                      onClick={onRefresh}
                    >
                      Refresh saved preferences
                    </button>
                  </p>
                )}
                <button className="btn-primary" disabled={busy}>
                  {busy ? "Saving…" : "Save preferences"}
                </button>
              </fieldset>
            </form>
          </section>
          <section className="account-panel" aria-labelledby="export-title">
            <h2 id="export-title">
              <Download size={21} aria-hidden="true" />
              Take a copy of your data
            </h2>
            <p>
              JSON includes your profile details, saved contests, reminder
              history, journal, practice, weekly goals and feedback. CSV
              contains your journal and its problem checklists. Uploaded photos
              download separately.
            </p>
            <div className="account-actions">
              {[
                { format: "json", label: "Download account JSON" },
                { format: "csv", label: "Download journal CSV" },
                ...(data.hasPhoto
                  ? [{ format: "photo", label: "Download profile photo" }]
                  : []),
              ].map((item) => (
                <button
                  className="btn-secondary"
                  key={item.format}
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await onExport(item.format);
                    } catch (err) {
                      toast.error(
                        err instanceof Error ? err.message : "Download failed.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Download size={15} aria-hidden="true" />
                  {item.label}
                </button>
              ))}
            </div>
          </section>
          <section
            className="account-panel account-danger"
            aria-labelledby="delete-title"
          >
            <h2 id="delete-title">
              <Trash2 size={21} aria-hidden="true" />
              Delete your account
            </h2>
            <p>
              This permanently removes your Contest Manager profile, photos,
              saved contests, journal, goals and feedback. Future emails are
              cancelled before cleanup. Emails already sent and records retained
              by email providers follow their own retention policies.
            </p>
            <p className="account-help">
              A recent Google sign-in is required. Signing in again after
              deletion creates a fresh account.
            </p>
            <div className="account-actions">
              <button className="btn-secondary" onClick={onReauthenticate}>
                Sign in again with Google
              </button>
              <button
                className="btn-secondary account-delete-button"
                onClick={onDelete}
                disabled={busy}
              >
                Delete account
              </button>
            </div>
          </section>
        </>
      )}
      <footer className="account-footer">
        <ShieldCheck size={16} aria-hidden="true" />
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/support">Support</Link>
        <Link href="/profile">Edit profile</Link>
      </footer>
    </div>
  );
}
function DeletionDialog({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (confirmation: string) => Promise<void>;
}) {
  const [confirmation, setConfirmation] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="account-overlay" />
        <Dialog.Content
          className="account-dialog"
          role="alertdialog"
          onEscapeKeyDown={(e) => {
            if (busy) e.preventDefault();
          }}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <Dialog.Title>Delete your account permanently?</Dialog.Title>
          <Dialog.Description>
            Export any data you want to keep first. We’ll stop future emails,
            remove your photos and data, and delete your Contest Manager
            sign-in. Your Google account is unaffected.
          </Dialog.Description>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (confirmation !== "DELETE" || busy) return;
              setBusy(true);
              setError(null);
              try {
                await onConfirm(confirmation);
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Deletion could not start.",
                );
                setBusy(false);
              }
            }}
          >
            <label className="account-field">
              <span>Type DELETE to confirm</span>
              <input
                value={confirmation}
                autoComplete="off"
                maxLength={6}
                disabled={busy}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </label>
            {error && (
              <p className="account-error" role="alert">
                {error}
              </p>
            )}
            <div className="account-actions">
              <button
                type="button"
                className="btn-secondary"
                disabled={busy}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary account-delete-button"
                disabled={busy || confirmation !== "DELETE"}
              >
                {busy ? "Starting deletion…" : "Permanently delete account"}
              </button>
            </div>
          </form>
          <button
            className="icon-button account-close"
            aria-label="Close deletion confirmation"
            disabled={busy}
            onClick={onClose}
          >
            <X size={17} aria-hidden="true" />
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
function DeletionReceipt({
  receipt,
  onReset,
}: {
  receipt: string;
  onReset: () => void;
}) {
  const [status, setStatus] = useState<{
      status: string;
      message: string;
    } | null>(null),
    [error, setError] = useState<string | null>(null);
  const { logout } = useAuth();
  useEffect(() => {
    const controller = new AbortController();
    let active = true,
      timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      let again = true;
      try {
        const response = await fetch("/api/account/deletion", {
          headers: { "X-Deletion-Receipt": receipt },
          cache: "no-store",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(15000),
          ]),
        });
        const data = await response.json();
        if (!response.ok) {
          if (response.status === 404) again = false;
          throw new Error(data.error);
        }
        if (active) {
          setStatus(data);
          setError(null);
        }
        again = data.status !== "complete";
      } catch (e) {
        if (active && !controller.signal.aborted)
          setError(
            e instanceof Error
              ? e.message
              : "Status is unavailable. Try again shortly.",
          );
      }
      if (active && again) timer = setTimeout(() => void refresh(), 15000);
    };
    void refresh();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [receipt]);
  return (
    <div className="site-container account-page">
      <section className="account-panel">
        <p className="eyebrow">ACCOUNT DELETION</p>
        <h1>
          {status?.status === "complete"
            ? "Your account has been deleted."
            : status
              ? "Your deletion request is processing."
              : "Checking your deletion request."}
        </h1>
        <p role="status">
          {status?.message ?? "Checking your private deletion receipt…"}
        </p>
        {error && (
          <p className="account-error" role="alert">
            {error}
          </p>
        )}
        <p className="account-help">
          You may close this page; the background worker continues cleanup. This
          browser keeps a private status receipt. Completed receipts expire
          after seven days.
        </p>
        <div className="account-actions">
          <Link className="btn-secondary" href="/support">
            Contact support
          </Link>
          <button
            className="btn-secondary"
            onClick={async () => {
              if (
                status?.status !== "complete" &&
                !window.confirm(
                  "Hide this browser’s receipt? Cleanup will continue. You can contact support if you need help.",
                )
              )
                return;
              await logout();
              localStorage.removeItem(receiptKey);
              onReset();
            }}
          >
            Sign out & close receipt
          </button>
        </div>
      </section>
    </div>
  );
}
export default function AccountSettings() {
  const { user, loading, reauthenticate } = useAuth(),
    state = useAccountPreferences();
  const [deleting, setDeleting] = useState(false),
    [receipt, setReceipt] = useState<string | null>(null);
  useEffect(() => {
    setReceipt(localStorage.getItem(receiptKey));
  }, []);
  if (receipt)
    return (
      <DeletionReceipt receipt={receipt} onReset={() => setReceipt(null)} />
    );
  if (loading || state.loading) return <AccountSkeleton />;
  if (!user)
    return (
      <div className="site-container account-page">
        <div className="account-panel">
          <h1>Manage your account.</h1>
          <p>
            Sign in to manage reminders, download your data or delete your
            account.
          </p>
          <AuthButton expanded />
        </div>
      </div>
    );
  if (!state.data)
    return (
      <div className="site-container account-page">
        <section className="account-panel" role="alert">
          <h1>Settings couldn’t load.</h1>
          <p>{state.error}</p>
          <button
            className="btn-secondary"
            onClick={() => void state.refresh()}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Retry
          </button>
        </section>
      </div>
    );
  async function download(format: string) {
    if (!user) return;
    const response = await fetch(`/api/account/export?format=${format}`, {
      headers: { Authorization: `Bearer ${await user.getAccessToken()}` },
      cache: "no-store",
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Download failed.");
    }
    const url = URL.createObjectURL(await response.blob()),
      a = document.createElement("a");
    a.href = url;
    a.download =
      format === "photo"
        ? "contest-manager-profile.webp"
        : `contest-manager-${format === "csv" ? "journal" : "account"}.${format}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <AccountSettingsView
        key={`${user.uid}:${state.data.revision}`}
        data={state.data}
        error={state.error}
        onRefresh={() => void state.refresh()}
        onSave={state.save}
        onExport={download}
        onDelete={() => setDeleting(true)}
        onReauthenticate={() => void reauthenticate()}
      />
      {deleting && (
        <DeletionDialog
          onClose={() => setDeleting(false)}
          onConfirm={async (confirmation) => {
            const accessToken = await user.getAccessToken();
            const bytes = crypto.getRandomValues(new Uint8Array(32)),
              token =
                localStorage.getItem(receiptKey) ??
                [...bytes].map((v) => v.toString(16).padStart(2, "0")).join("");
            localStorage.setItem(receiptKey, token);
            const response = await fetch("/api/account/deletion", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ confirmation, receipt: token }),
              signal: AbortSignal.timeout(20000),
            });
            const data = await response.json();
            if (!response.ok) {
              if (response.status < 500) localStorage.removeItem(receiptKey);
              throw new Error(
                data.error ||
                  "Deletion could not start. Retry to check the same request.",
              );
            }
            setReceipt(token);
            setDeleting(false);
          }}
        />
      )}
    </>
  );
}
