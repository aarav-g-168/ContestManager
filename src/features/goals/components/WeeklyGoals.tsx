"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Dialog } from "radix-ui";
import {
  ArrowRight,
  Check,
  Flag,
  ListChecks,
  PencilLine,
  RefreshCw,
  Target,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  SkeletonBlock,
  SkeletonStatus,
} from "@/components/feedback/LoadingSkeleton";
import { useAuth } from "@/features/auth/components/AuthProvider";
import {
  GoalsSaveError,
  useWeeklyGoals,
  type GoalsMutation,
} from "@/features/goals/hooks/useWeeklyGoals";
import {
  GOAL_LIMITS,
  goalPercent,
  type WeeklyGoalsSnapshot,
} from "@/features/goals/lib/goals";
import "@/features/goals/styles.css";

const shortDate = (value: string) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
type Props = {
  data: WeeklyGoalsSnapshot;
  pending: boolean;
  error: string | null;
  onRefresh: () => void;
  onSave: (input: GoalsMutation) => Promise<void>;
};
export function WeeklyGoalsView({
  data,
  pending,
  error,
  onRefresh,
  onSave,
}: Props) {
  const [editing, setEditing] = useState<WeeklyGoalsSnapshot | null>(null);
  const active = data.targets.contests > 0 || data.targets.problems > 0;
  return (
    <section className="goals-panel" aria-label="Weekly goals">
      <header className="goals-heading">
        <div>
          <p className="goals-eyebrow">
            <Target size={15} aria-hidden="true" />
            THIS WEEK · ALL PLATFORMS
          </p>
          <h2>Weekly goals</h2>
          <p>
            {shortDate(data.week.start)} – {shortDate(data.week.end)}{" "}
            <span>· Monday–Sunday · IST</span>
          </p>
        </div>
        <div className="goals-tools">
          <button
            className="icon-button"
            disabled={pending}
            onClick={onRefresh}
            aria-label="Refresh weekly goals"
          >
            <RefreshCw
              size={16}
              aria-hidden="true"
              className={pending ? "animate-spin" : ""}
            />
          </button>
          <button
            className={active ? "btn-secondary" : "btn-primary"}
            onClick={() => setEditing(data)}
            disabled={pending}
          >
            <PencilLine size={15} aria-hidden="true" />
            {active ? "Edit goals" : "Set weekly goals"}
          </button>
        </div>
      </header>
      {error && (
        <p className="goals-error" role="alert">
          {error} Showing your last loaded goals.
        </p>
      )}
      {!active && (
        <p className="goals-intro">
          Choose a manageable target for contests and practice. This week is
          yours to plan.
        </p>
      )}
      <div className="goals-grid" aria-busy={pending}>
        {(
          [
            {
              key: "contests",
              label: "Contests entered",
              noun: "contests",
              Icon: Flag,
              href: `/journal?status=participated&from=${data.week.start}&to=${data.week.today}`,
              link: "Log a round",
            },
            {
              key: "problems",
              label: "Problems revisited",
              noun: "problems",
              Icon: ListChecks,
              href: "/journal?view=practice",
              link: "Choose a problem",
            },
          ] as const
        ).map(({ key, label, noun, Icon, href, link }) => {
          const count = data.counts[key],
            target = data.targets[key],
            met = target > 0 && count >= target;
          return (
            <div className="goals-metric" key={key} data-met={met}>
              <div className="goals-metric-label">
                <span>
                  <Icon size={17} aria-hidden="true" />
                  {label}
                </span>
                {met && (
                  <span className="goals-met">
                    <Check size={14} aria-hidden="true" />
                    Goal met
                  </span>
                )}
              </div>
              <p className="goals-number">
                <strong>{count}</strong>
                {target > 0 ? (
                  <span>/ {target}</span>
                ) : (
                  <span>recorded · no target</span>
                )}
              </p>
              {target > 0 ? (
                <>
                  <progress
                    max={target}
                    value={Math.min(count, target)}
                    aria-label={`${count} of ${target} ${noun} this week`}
                  />
                  <p className="goals-metric-note">
                    {met
                      ? `${goalPercent(count, target)}% of your target · keep going if you like`
                      : `${target - count} more to reach your target`}
                  </p>
                </>
              ) : (
                <p className="goals-metric-note">
                  Set a target when you’re ready.
                </p>
              )}
              <Link className="text-link" href={href}>
                {link}
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          );
        })}
      </div>
      <footer className="goals-footnote">
        From your private journal. Contest dates and recorded practice
        completions use IST. Targets apply to this week only.
      </footer>
      {editing && (
        <GoalsEditor
          base={editing}
          latest={data}
          pending={pending}
          onClose={() => setEditing(null)}
          onSave={onSave}
        />
      )}
    </section>
  );
}
function GoalsEditor({
  base: initial,
  latest,
  pending,
  onClose,
  onSave,
}: {
  base: WeeklyGoalsSnapshot;
  latest: WeeklyGoalsSnapshot;
  pending: boolean;
  onClose: () => void;
  onSave: (input: GoalsMutation) => Promise<void>;
}) {
  const [base, setBase] = useState(initial);
  const [draft, setDraft] = useState({
    contests: String(initial.targets.contests),
    problems: String(initial.targets.problems),
  });
  const [saving, setSaving] = useState(false),
    [error, setError] = useState<string | null>(null),
    [conflict, setConflict] = useState(false),
    [discard, setDiscard] = useState(false);
  const dirty =
    draft.contests !== String(base.targets.contests) ||
    draft.problems !== String(base.targets.problems);
  const invalid = (["contests", "problems"] as const).filter(
    (key) => !/^\d+$/.test(draft[key]) || Number(draft[key]) > GOAL_LIMITS[key],
  );
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function close() {
    if (saving) return;
    if (dirty) setDiscard(true);
    else onClose();
  }
  async function submit() {
    if (invalid.length || saving || conflict) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        weekStart: base.week.start,
        revision: base.revision,
        contests: Number(draft.contests),
        problems: Number(draft.problems),
      });
      toast.success("Weekly goals saved.");
      onClose();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Your goals couldn’t be saved.",
      );
      setConflict(e instanceof GoalsSaveError && e.status === 409);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="goals-overlay" />
        <Dialog.Content
          role={discard ? "alertdialog" : "dialog"}
          className="goals-dialog"
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            if (discard) setDiscard(false);
            else close();
          }}
          onPointerDownOutside={(e) => {
            e.preventDefault();
            if (!discard) close();
          }}
        >
          <Dialog.Title>
            {discard ? "Discard your changes?" : "Your targets for this week"}
          </Dialog.Title>
          <Dialog.Description>
            {discard
              ? "Your saved goals will stay as they are."
              : `${shortDate(base.week.start)} – ${shortDate(base.week.end)} · Monday–Sunday in IST. Keep the targets realistic; you can adjust them later.`}
          </Dialog.Description>
          {!discard && (
            <button
              className="icon-button goals-close"
              aria-label="Close weekly goals editor"
              onClick={close}
              disabled={saving}
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
          {discard ? (
            <div className="goals-dialog-actions">
              <button
                className="btn-secondary"
                onClick={() => setDiscard(false)}
              >
                Keep editing
              </button>
              <button className="btn-primary" onClick={onClose}>
                Discard changes
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <fieldset disabled={saving}>
                <legend className="sr-only">Weekly targets</legend>
                {(
                  [
                    {
                      key: "contests",
                      label: "Contests to enter",
                      hint: "Counts journal entries marked Participated, using their contest date.",
                    },
                    {
                      key: "problems",
                      label: "Problems to revisit",
                      hint: "Counts problems marked revisited this week, including older contests. Unknown completion dates are excluded.",
                    },
                  ] as const
                ).map(({ key, label, hint }) => (
                  <label key={key} className="goals-field">
                    <span>{label}</span>
                    <input
                      aria-label={label}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={GOAL_LIMITS[key]}
                      step={1}
                      value={draft[key]}
                      onChange={(e) =>
                        setDraft({ ...draft, [key]: e.target.value })
                      }
                      aria-invalid={invalid.includes(key)}
                      aria-describedby={`goal-${key}-hint`}
                    />
                    <small id={`goal-${key}-hint`}>
                      {hint} Use 0 to leave this target off; maximum{" "}
                      {GOAL_LIMITS[key]}.
                    </small>
                    {invalid.includes(key) && (
                      <span className="goals-error">
                        Enter a whole number from 0 to {GOAL_LIMITS[key]}.
                      </span>
                    )}
                  </label>
                ))}
              </fieldset>
              {error && (
                <div className="goals-error" role="alert">
                  <p>{error} Your draft is still here.</p>
                  {conflict && (
                    <>
                      <p>
                        Latest saved targets for {shortDate(latest.week.start)}:{" "}
                        {latest.targets.contests} contests and{" "}
                        {latest.targets.problems} problems.
                      </p>
                      <div className="goals-conflict-actions">
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={pending}
                          onClick={() => {
                            setBase(latest);
                            setConflict(false);
                            setError(null);
                          }}
                        >
                          Keep my changes
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={pending}
                          onClick={() => {
                            setBase(latest);
                            setDraft({
                              contests: String(latest.targets.contests),
                              problems: String(latest.targets.problems),
                            });
                            setConflict(false);
                            setError(null);
                          }}
                        >
                          Load saved targets
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              <div className="goals-dialog-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={close}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  type="submit"
                  disabled={
                    saving ||
                    invalid.length > 0 ||
                    conflict ||
                    (!dirty && base.revision !== null)
                  }
                >
                  {saving ? "Saving…" : "Save goals"}
                </button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function WeeklyGoalsSkeleton() {
  return (
    <SkeletonStatus label="Loading your weekly goals" className="goals-panel">
      <SkeletonBlock className="h-6 w-40 mb-6" />
      <div className="goals-grid">
        <SkeletonBlock className="h-36" />
        <SkeletonBlock className="h-36" />
      </div>
    </SkeletonStatus>
  );
}
export default function WeeklyGoals() {
  const { user, loading } = useAuth();
  const state = useWeeklyGoals();
  if (loading || state.loading) return <WeeklyGoalsSkeleton />;
  if (!user) return null;
  if (!state.data)
    return (
      <section className="goals-panel" aria-label="Weekly goals">
        <h2>Weekly goals</h2>
        <p className="goals-error" role="alert">
          {state.error || "Your weekly goals couldn’t load."}
        </p>
        <button
          className="btn-secondary"
          disabled={state.pending}
          onClick={() => void state.refresh()}
        >
          Try again
        </button>
      </section>
    );
  return (
    <WeeklyGoalsView
      key={user.uid}
      data={state.data}
      pending={state.pending}
      error={state.error}
      onRefresh={() => void state.refresh()}
      onSave={state.save}
    />
  );
}
