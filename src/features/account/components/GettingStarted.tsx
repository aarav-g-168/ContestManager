"use client";
import Link from "next/link";
import { useState } from "react";
import { Check, ArrowRight, X } from "lucide-react";
import { useAccountPreferences } from "@/features/account/components/AccountPreferencesProvider";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { toast } from "sonner";
import "@/features/account/styles.css";
export default function GettingStarted() {
  const { user } = useAuth(),
    state = useAccountPreferences(),
    [busy, setBusy] = useState(false);
  const data = state.data;
  if (
    !user ||
    !data ||
    data.onboardingDismissed ||
    data.deleting ||
    !data.onboarding ||
    Object.values(data.onboarding).every(Boolean)
  )
    return null;
  return (
    <section className="getting-started" aria-label="Getting started">
      <div className="account-section-heading">
        <div>
          <p className="eyebrow">MAKE YOURSELF AT HOME</p>
          <h2>Your first three steps</h2>
        </div>
        <button
          className="icon-button"
          disabled={busy}
          aria-label="Dismiss getting-started checklist"
          onClick={async () => {
            setBusy(true);
            try {
              await state.save({ ...data, onboardingDismissed: true });
            } catch (e) {
              toast.error(
                e instanceof Error
                  ? e.message
                  : "Couldn’t dismiss the checklist.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <X size={17} aria-hidden="true" />
        </button>
      </div>
      <ol>
        {(
          [
            { key: "saved", label: "Save a contest", href: "/contests" },
            { key: "reminded", label: "Set a reminder", href: "/bookmarks" },
            { key: "journaled", label: "Record a round", href: "/journal" },
          ] as const
        ).map((step, index) => (
          <li key={step.key}>
            <span
              className="onboarding-step"
              data-done={data.onboarding![step.key]}
            >
              {data.onboarding![step.key] ? (
                <Check size={15} aria-hidden="true" />
              ) : (
                index + 1
              )}
            </span>
            <Link href={step.href}>
              {step.label}
              <span className="sr-only">
                {data.onboarding![step.key] ? " — completed" : ""}
              </span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
