"use client";
import { useRef, useState } from "react";
import { LoaderCircle, RotateCcw } from "lucide-react";
import {
  DEFAULT_DISCOVERY,
  DISCOVERY_TIMES,
  type DiscoveryPreferences,
} from "@/features/contests/lib/discovery";
import { getPlatform } from "@/features/contests/lib/platforms";

const days = [
  [1, "Mon"],
  [2, "Tue"],
  [3, "Wed"],
  [4, "Thu"],
  [5, "Fri"],
  [6, "Sat"],
  [0, "Sun"],
] as const;
export default function DiscoveryPreferencesEditor({
  preferences,
  platforms,
  signedIn,
  canSave,
  onSave,
  onClose,
}: {
  preferences: DiscoveryPreferences;
  platforms: string[];
  signedIn: boolean;
  canSave: boolean;
  onSave: (values: DiscoveryPreferences, expected: string) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(preferences);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const original = useRef(JSON.stringify(preferences));
  const [platformSearch, setPlatformSearch] = useState("");
  const visiblePlatforms = platforms.filter((host) =>
    `${host} ${getPlatform(host).name}`
      .toLowerCase()
      .includes(platformSearch.trim().toLowerCase()),
  );
  return (
    <form
      className="discovery-preferences"
      onSubmit={async (event) => {
        event.preventDefault();
        if (lock.current) return;
        lock.current = true;
        setBusy(true);
        setError(null);
        try {
          await onSave(draft, original.current);
          onClose();
        } catch (e) {
          setError(
            e instanceof Error
              ? e.message
              : "Your choices couldn’t be saved. Try again.",
          );
        } finally {
          lock.current = false;
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy || !canSave}>
        <legend className="sr-only">Personalise discovery</legend>
        <div className="discovery-preferences-heading">
          <h3>Your contest preferences</h3>
          <span>All times in IST</span>
        </div>
        <label className="discovery-enable">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(event) =>
              setDraft({ ...draft, enabled: event.target.checked })
            }
          />{" "}
          Show personalised suggestions
        </label>
        <div className="discovery-preference-group">
          <label>
            Favourite platforms{" "}
            <span>Up to 12 · leave empty for any platform</span>
            <input
              type="search"
              value={platformSearch}
              onChange={(e) => setPlatformSearch(e.target.value)}
              placeholder="Find a platform"
            />
          </label>
          <div
            className="discovery-platforms"
            role="group"
            aria-label="Favourite platforms"
          >
            {visiblePlatforms.map((host) => (
              <button
                type="button"
                key={host}
                aria-pressed={draft.platforms.includes(host)}
                className="filter-chip"
                disabled={
                  !draft.platforms.includes(host) &&
                  draft.platforms.length >= 12
                }
                onClick={() =>
                  setDraft({
                    ...draft,
                    platforms: draft.platforms.includes(host)
                      ? draft.platforms.filter((item) => item !== host)
                      : [...draft.platforms, host],
                  })
                }
              >
                {getPlatform(host).name}
              </button>
            ))}
          </div>
          {!visiblePlatforms.length && (
            <p className="discovery-storage-note" role="status">
              No matching platforms. Try another name.
            </p>
          )}
        </div>
        <div className="discovery-preference-group">
          <p>
            Days you’re usually free <span>Leave empty for any day</span>
          </p>
          <div
            className="discovery-days"
            role="group"
            aria-label="Preferred contest days"
          >
            {days.map(([day, label]) => (
              <button
                type="button"
                className="filter-chip"
                key={day}
                aria-pressed={draft.days.includes(day)}
                onClick={() =>
                  setDraft({
                    ...draft,
                    days: draft.days.includes(day)
                      ? draft.days.filter((item) => item !== day)
                      : [...draft.days, day],
                  })
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="discovery-preference-grid">
          <label>
            Preferred start time · IST
            <select
              value={draft.time}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  time: event.target.value as DiscoveryPreferences["time"],
                })
              }
            >
              {Object.entries(DISCOVERY_TIMES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Time for a contest
            <select
              value={draft.maxMinutes ?? "any"}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  maxMinutes:
                    event.target.value === "any"
                      ? null
                      : Number(event.target.value),
                })
              }
            >
              <option value="any">Any length</option>
              <option value="60">Up to 1 hour</option>
              <option value="120">Up to 2 hours</option>
              <option value="180">Up to 3 hours</option>
            </select>
          </label>
        </div>
        <p className="discovery-storage-note">
          {signedIn
            ? "Saved privately to your account and available across devices."
            : "Saved in this browser. Sign in to save separate preferences to your account."}{" "}
          These choices rank suggestions; they don’t hide contests or create
          reminders.
        </p>
        {error && (
          <p role="alert" className="discovery-save-error">
            {error}
          </p>
        )}
        <div className="discovery-preference-actions">
          <button
            type="button"
            className="text-link"
            onClick={() =>
              setDraft({ ...DEFAULT_DISCOVERY, platforms: [], days: [] })
            }
          >
            <RotateCcw size={14} aria-hidden="true" /> Reset choices
          </button>
          <div>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" type="submit">
              {busy ? (
                <LoaderCircle
                  size={15}
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : null}
              {busy ? "Saving…" : "Save preferences"}
            </button>
          </div>
        </div>
      </fieldset>
    </form>
  );
}
