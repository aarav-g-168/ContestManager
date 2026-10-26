"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Dialog } from "radix-ui";
import JournalContestPicker from "@/features/journal/components/JournalContestPicker";
import {
  BookOpen,
  Check,
  LockKeyhole,
  Link2,
  LoaderCircle,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  blankJournal,
  JOURNAL_STATUSES,
  JOURNAL_TOPICS,
  validateJournal,
  JournalValidationError,
  type JournalCandidate,
  type JournalEntry,
  type JournalValues,
} from "@/features/journal/lib/journal";
import { JournalApiError } from "@/features/journal/hooks/useJournal";
import { getPlatform } from "@/features/contests/lib/platforms";

type Props = {
  entry: JournalEntry | null;
  candidates: JournalCandidate[];
  candidateError?: string | null;
  today: string;
  onClose: () => void;
  onSave: (
    values: JournalValues,
    entry: JournalEntry | null,
  ) => Promise<JournalEntry>;
};
function Field({
  name,
  label,
  error,
  children,
  hint,
}: {
  name: string;
  label: string;
  error?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="journal-field">
      <label htmlFor={`journal-${name}`}>{label}</label>
      {children}
      {hint && <p className="journal-hint">{hint}</p>}
      {error && (
        <p id={`journal-error-${name}`} className="journal-field-error">
          {error}
        </p>
      )}
    </div>
  );
}
export default function JournalEditor({
  entry,
  candidates,
  candidateError,
  today,
  onClose,
  onSave,
}: Props) {
  const initial = entry?.values ?? blankJournal(today);
  const [values, setValues] = useState<JournalValues>(initial);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [tag, setTag] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const keepEditingRef = useRef<HTMLButtonElement>(null);
  const lock = useRef(false);
  const dirty = JSON.stringify(initial) !== JSON.stringify(values);
  const linked = values.contestId !== null;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    if (discard) keepEditingRef.current?.focus();
    else
      formRef.current
        ?.querySelector<HTMLElement>(
          "[data-journal-contest-picker], select, input",
        )
        ?.focus();
  }, [discard]);
  function change<K extends keyof JournalValues>(
    key: K,
    value: JournalValues[K],
  ) {
    setValues((old) => ({ ...old, [key]: value }));
    setFields((old) => ({ ...old, [key]: "" }));
  }
  function close() {
    if (lock.current) return;
    if (discard) {
      setDiscard(false);
      return;
    }
    if (dirty) setDiscard(true);
    else onClose();
  }
  function props(name: string) {
    return {
      id: `journal-${name}`,
      "aria-invalid": !!fields[name],
      "aria-describedby": fields[name] ? `journal-error-${name}` : undefined,
    };
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    setError(null);
    setFields({});
    try {
      validateJournal(values);
    } catch (e) {
      if (e instanceof JournalValidationError) {
        setFields(e.fields);
        setError("Check the highlighted fields before saving.");
        window.setTimeout(
          () =>
            formRef.current
              ?.querySelector<HTMLElement>('[aria-invalid="true"]')
              ?.focus(),
          0,
        );
      }
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      await onSave(values, entry);
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Your entry couldn’t be saved. Your draft is still here.",
      );
      if (e instanceof JournalApiError) setFields(e.fields);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const number = (raw: string) => (raw === "" ? null : Number(raw));
  function addTag() {
    const cleaned = tag.trim();
    if (!cleaned || cleaned.length > 32 || values.tags.length >= 12) return;
    change("tags", [...new Set([...values.tags, cleaned])]);
    setTag("");
  }
  return (
    <>
      <Dialog.Root
        open
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="journal-overlay" />
          <Dialog.Content
            className="journal-editor"
            data-discard={discard}
            role={discard ? "alertdialog" : "dialog"}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              formRef.current
                ?.querySelector<HTMLElement>(
                  "[data-journal-contest-picker], select, input",
                )
                ?.focus();
            }}
            onEscapeKeyDown={(event) => {
              if (busy || formRef.current?.querySelector('[data-picker-open="true"]')) event.preventDefault();
            }}
            onPointerDownOutside={(event) => {
              if (busy) event.preventDefault();
            }}
          >
            <div className="journal-editor-heading">
              <div>
                <span className="journal-eyebrow">
                  <BookOpen size={15} aria-hidden="true" />
                  CONTEST JOURNAL
                </span>
                <Dialog.Title>
                  {discard
                    ? "Discard this draft?"
                    : entry
                      ? "Review your round"
                      : "Add a round"}
                </Dialog.Title>
                <Dialog.Description>
                  {discard
                    ? "Your unsaved changes will be lost. Your saved journal entry will stay as it is."
                    : "Keep the result, the lessons, and the problems worth another try."}
                </Dialog.Description>
              </div>
              <button
                className="icon-button"
                aria-label={
                  discard ? "Return to editing" : "Close journal editor"
                }
                onClick={close}
                disabled={busy}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <form
              hidden={discard}
              ref={formRef}
              onSubmit={submit}
              noValidate
              className="journal-entry-form"
              aria-busy={busy}
            >
              <fieldset disabled={busy}>
                {error && (
                  <div className="journal-form-error" role="alert">
                    {error}
                    {error.includes("another tab") && (
                      <p>
                        Close this draft, refresh the journal, and open the
                        latest entry. Your changes haven’t overwritten it.
                      </p>
                    )}
                  </div>
                )}
                <section aria-labelledby="journal-contest-section">
                  <div className="journal-form-section-heading">
                    <span>01</span>
                    <h3 id="journal-contest-section">The contest</h3>
                  </div>
                  {!entry && (
                    <>
                      {candidateError && (
                        <p className="journal-hint" role="status">
                          {candidateError}
                        </p>
                      )}
                      <Field name="prefill" label="Choose a contest">
                        <JournalContestPicker
                          candidates={candidates}
                          value={values.contestId}
                          onSelect={(candidate) =>
                            setValues((current) => ({
                              ...current,
                              contestId: candidate?.id ?? null,
                              title: candidate?.title ?? "",
                              host: candidate?.host ?? "",
                              href: candidate?.href ?? "",
                              date: candidate?.date ?? today,
                            }))
                          }
                        />
                        <p id="journal-contest-hint" className="journal-hint">
                          Search recent rounds from the last 30 days and your
                          saved contest history. Only contests that have started
                          appear. The recent feed refreshes every 30 minutes.
                        </p>
                      </Field>
                    </>
                  )}
                  <Field name="title" label="Contest name" error={fields.title}>
                    <input
                      {...props("title")}
                      value={values.title}
                      onChange={(e) => change("title", e.target.value)}
                      maxLength={180}
                      readOnly={linked}
                      placeholder="e.g. Codeforces Round 1063 (Div. 2)"
                    />
                  </Field>
                  <div className="journal-form-grid">
                    <Field
                      name="host"
                      label="Platform domain"
                      error={fields.host}
                    >
                      <input
                        {...props("host")}
                        list="journal-platforms"
                        value={values.host}
                        onChange={(e) => change("host", e.target.value)}
                        maxLength={100}
                        readOnly={linked}
                        placeholder="codeforces.com"
                      />
                      <datalist id="journal-platforms">
                        {[
                          "codeforces.com",
                          "leetcode.com",
                          "atcoder.jp",
                          "codechef.com",
                          "hackerrank.com",
                        ].map((host) => (
                          <option key={host} value={host}>
                            {getPlatform(host).name}
                          </option>
                        ))}
                      </datalist>
                    </Field>
                    <Field
                      name="date"
                      label="Contest date · IST"
                      error={fields.date}
                    >
                      <input
                        {...props("date")}
                        type="date"
                        value={values.date}
                        onChange={(e) => change("date", e.target.value)}
                        min="2000-01-01"
                        max={today}
                        readOnly={linked}
                      />
                    </Field>
                  </div>
                  <Field
                    name="href"
                    label="Contest link (optional)"
                    error={fields.href}
                  >
                    <input
                      {...props("href")}
                      type="url"
                      value={values.href}
                      onChange={(e) => change("href", e.target.value)}
                      maxLength={1000}
                      readOnly={linked}
                      placeholder="https://…"
                    />
                  </Field>
                  {linked && (
                    <p className="journal-hint">
                      Contest details are prefilled from the selected round.
                      Your results and notes are entered by you.
                    </p>
                  )}
                </section>
                <section aria-labelledby="journal-result-section">
                  <div className="journal-form-section-heading">
                    <span>02</span>
                    <h3 id="journal-result-section">Your result</h3>
                    <small>Manually entered</small>
                  </div>
                  <Field
                    name="status"
                    label="Participation status"
                    error={fields.status}
                  >
                    <select
                      {...props("status")}
                      value={values.status}
                      onChange={(e) =>
                        change(
                          "status",
                          e.target.value as JournalValues["status"],
                        )
                      }
                    >
                      {Object.entries(JOURNAL_STATUSES).map(([id, label]) => (
                        <option key={id} value={id}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="journal-form-grid journal-three-fields">
                    <Field
                      name="rank"
                      label="Rank (optional)"
                      error={fields.rank}
                    >
                      <input
                        {...props("rank")}
                        type="number"
                        min={1}
                        max={100000000}
                        step={1}
                        inputMode="numeric"
                        value={values.rank ?? ""}
                        onChange={(e) => change("rank", number(e.target.value))}
                        placeholder="—"
                      />
                    </Field>
                    <Field
                      name="score"
                      label="Score (optional)"
                      error={fields.score}
                    >
                      <input
                        {...props("score")}
                        value={values.score}
                        onChange={(e) => change("score", e.target.value)}
                        maxLength={40}
                        placeholder="—"
                      />
                    </Field>
                    <Field
                      name="solved"
                      label="Solved in contest"
                      error={fields.solved}
                    >
                      <input
                        {...props("solved")}
                        type="number"
                        min={0}
                        max={1000}
                        step={1}
                        inputMode="numeric"
                        value={values.solved ?? ""}
                        onChange={(e) =>
                          change("solved", number(e.target.value))
                        }
                        placeholder="—"
                      />
                    </Field>
                  </div>
                </section>
                <section aria-labelledby="journal-review-section">
                  <div className="journal-form-section-heading">
                    <span>03</span>
                    <h3 id="journal-review-section">
                      What you’ll take from it
                    </h3>
                  </div>
                  {(
                    [
                      {
                        key: "wentWell",
                        label: "What went well",
                        placeholder:
                          "A good approach, a quick solve, or something that clicked.",
                      },
                      {
                        key: "mistakes",
                        label: "Mistakes & sticking points",
                        placeholder:
                          "Where did you lose time? What would you change?",
                      },
                      {
                        key: "lessons",
                        label: "Lessons for next time",
                        placeholder:
                          "One thing you want to remember for the next round.",
                      },
                    ] as const
                  ).map(({ key, label, placeholder }) => (
                    <Field
                      key={key}
                      name={key}
                      label={label}
                      error={fields[key]}
                    >
                      <textarea
                        {...props(key)}
                        rows={3}
                        value={values[key]}
                        onChange={(e) => change(key, e.target.value)}
                        maxLength={2000}
                        placeholder={placeholder}
                      />
                    </Field>
                  ))}
                </section>
                <section aria-labelledby="journal-topics-section">
                  <div className="journal-form-section-heading">
                    <span>04</span>
                    <h3 id="journal-topics-section">Topics</h3>
                    <small>Up to 12</small>
                  </div>
                  <div
                    className="journal-topic-options"
                    role="group"
                    aria-label="Choose contest topics"
                  >
                    {[...new Set([...JOURNAL_TOPICS, ...values.tags])].map(
                      (topic) => (
                        <button
                          type="button"
                          key={topic}
                          aria-pressed={values.tags.includes(topic)}
                          disabled={
                            !values.tags.includes(topic) &&
                            values.tags.length >= 12
                          }
                          onClick={() =>
                            change(
                              "tags",
                              values.tags.includes(topic)
                                ? values.tags.filter((t) => t !== topic)
                                : [...values.tags, topic],
                            )
                          }
                        >
                          {values.tags.includes(topic) && (
                            <Check size={12} aria-hidden="true" />
                          )}
                          {topic}
                        </button>
                      ),
                    )}
                  </div>
                  <div className="journal-add-tag">
                    <label className="sr-only" htmlFor="journal-custom-topic">
                      Custom topic
                    </label>
                    <input
                      id="journal-custom-topic"
                      value={tag}
                      maxLength={32}
                      placeholder="Add another topic"
                      onChange={(e) => setTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={addTag}
                      disabled={!tag.trim() || values.tags.length >= 12}
                    >
                      Add topic
                    </button>
                  </div>
                  {fields.tags && (
                    <p className="journal-field-error">{fields.tags}</p>
                  )}
                </section>
                <section aria-labelledby="journal-problems-section">
                  <div className="journal-form-section-heading">
                    <span>05</span>
                    <h3 id="journal-problems-section">Problems to revisit</h3>
                    <small>
                      {values.problems.filter((p) => p.done).length}/
                      {values.problems.length} done
                    </small>
                  </div>
                  <p className="journal-hint">
                    Use this checklist for practice after the contest. It
                    doesn’t change your contest solved count.
                  </p>
                  {values.problems.map((p, index) => (
                    <div className="journal-problem-editor" key={p.id}>
                      <label className="journal-check-label">
                        <input
                          type="checkbox"
                          checked={p.done}
                          onChange={(e) =>
                            change(
                              "problems",
                              values.problems.map((x) =>
                                x.id === p.id
                                  ? { ...x, done: e.target.checked }
                                  : x,
                              ),
                            )
                          }
                          aria-label={`Mark problem ${index + 1} as revisited`}
                        />
                        <span>{String(index + 1).padStart(2, "0")}</span>
                      </label>
                      <div>
                        <label
                          className="sr-only"
                          htmlFor={`problem-title-${p.id}`}
                        >
                          Problem {index + 1} name
                        </label>
                        <input
                          id={`problem-title-${p.id}`}
                          value={p.title}
                          onChange={(e) =>
                            change(
                              "problems",
                              values.problems.map((x) =>
                                x.id === p.id
                                  ? { ...x, title: e.target.value }
                                  : x,
                              ),
                            )
                          }
                          maxLength={120}
                          placeholder="Problem name or number"
                          aria-invalid={!!fields.problems}
                        />
                        <label
                          className="sr-only"
                          htmlFor={`problem-url-${p.id}`}
                        >
                          Problem {index + 1} link (optional)
                        </label>
                        <input
                          id={`problem-url-${p.id}`}
                          type="url"
                          value={p.url}
                          maxLength={1000}
                          onChange={(e) =>
                            change(
                              "problems",
                              values.problems.map((x) =>
                                x.id === p.id
                                  ? { ...x, url: e.target.value }
                                  : x,
                              ),
                            )
                          }
                          placeholder="Problem link · https://… (optional)"
                        />
                      </div>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Remove problem ${index + 1}`}
                        onClick={() =>
                          change(
                            "problems",
                            values.problems.filter((x) => x.id !== p.id),
                          )
                        }
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                  {fields.problems && (
                    <p className="journal-field-error" role="alert">
                      {fields.problems}
                    </p>
                  )}
                  <button
                    type="button"
                    className="journal-add-row"
                    disabled={values.problems.length >= 30}
                    onClick={() =>
                      change("problems", [
                        ...values.problems,
                        {
                          id: crypto.randomUUID(),
                          title: "",
                          url: "",
                          done: false,
                        },
                      ])
                    }
                  >
                    <Plus size={16} aria-hidden="true" />
                    Add a problem
                  </button>
                </section>
                <section aria-labelledby="journal-links-section">
                  <div className="journal-form-section-heading">
                    <span>06</span>
                    <h3 id="journal-links-section">Keep the useful links</h3>
                    <small>Up to 10</small>
                  </div>
                  <p className="journal-hint">
                    Your submissions, solutions, the editorial, or a resource
                    that helped. Use full HTTPS links.
                  </p>
                  {values.links.map((link, index) => (
                    <div className="journal-link-editor" key={link.id}>
                      <Link2 size={17} aria-hidden="true" />
                      <div>
                        <label
                          className="sr-only"
                          htmlFor={`reference-label-${link.id}`}
                        >
                          Reference {index + 1} label
                        </label>
                        <input
                          id={`reference-label-${link.id}`}
                          value={link.label}
                          maxLength={80}
                          onChange={(e) =>
                            change(
                              "links",
                              values.links.map((l) =>
                                l.id === link.id
                                  ? { ...l, label: e.target.value }
                                  : l,
                              ),
                            )
                          }
                          placeholder="e.g. Editorial or my submission"
                          aria-invalid={!!fields.links}
                        />
                        <label
                          className="sr-only"
                          htmlFor={`reference-url-${link.id}`}
                        >
                          Reference {index + 1} URL
                        </label>
                        <input
                          id={`reference-url-${link.id}`}
                          type="url"
                          value={link.url}
                          maxLength={1000}
                          onChange={(e) =>
                            change(
                              "links",
                              values.links.map((l) =>
                                l.id === link.id
                                  ? { ...l, url: e.target.value }
                                  : l,
                              ),
                            )
                          }
                          placeholder="https://…"
                        />
                      </div>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Remove reference ${index + 1}`}
                        onClick={() =>
                          change(
                            "links",
                            values.links.filter((l) => l.id !== link.id),
                          )
                        }
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                  {fields.links && (
                    <p className="journal-field-error" role="alert">
                      {fields.links}
                    </p>
                  )}
                  <button
                    type="button"
                    className="journal-add-row"
                    disabled={values.links.length >= 10}
                    onClick={() =>
                      change("links", [
                        ...values.links,
                        { id: crypto.randomUUID(), label: "", url: "" },
                      ])
                    }
                  >
                    <Plus size={16} aria-hidden="true" />
                    Add a link
                  </button>
                </section>
              </fieldset>
              <div className="journal-editor-actions">
                <span>
                  <LockKeyhole size={13} aria-hidden="true" />
                  Private to your account
                </span>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={close}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={busy}>
                  {busy && (
                    <LoaderCircle
                      size={15}
                      className="animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  {busy ? "Saving…" : entry ? "Save changes" : "Save entry"}
                </button>
              </div>
            </form>
            {discard && (
              <div className="journal-discard-actions">
                <button
                  ref={keepEditingRef}
                  className="btn-secondary"
                  onClick={() => setDiscard(false)}
                >
                  Keep editing
                </button>
                <button className="btn-primary" onClick={onClose}>
                  Discard draft
                </button>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
