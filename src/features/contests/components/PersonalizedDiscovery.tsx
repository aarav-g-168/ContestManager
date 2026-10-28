"use client";
import { useId, useRef, useState } from "react";
import { SlidersHorizontal, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useClock } from "@/hooks/useClock";
import { useDiscoveryPreferences } from "@/features/contests/hooks/useDiscoveryPreferences";
import {
  hasDiscoveryPreferences,
  recommendContests,
  type DiscoveryPreferences,
} from "@/features/contests/lib/discovery";
import { getPlatform, getPlatformKey } from "@/features/contests/lib/platforms";
import type { Contest } from "@/features/contests/types";
import ContestBrowser from "@/features/contests/components/ContestBrowser";
import DiscoveryPreferencesEditor from "@/features/contests/components/DiscoveryPreferencesEditor";
import {
  SkeletonBlock,
  SkeletonStatus,
} from "@/components/feedback/LoadingSkeleton";
import "@/features/contests/styles.css";

export function PersonalizedDiscoveryView({
  contests,
  now,
  preferences,
  signedIn,
  canSave,
  error,
  onRefresh,
  onSave,
}: {
  contests: Contest[];
  now: number;
  preferences: DiscoveryPreferences;
  signedIn: boolean;
  canSave: boolean;
  error: string | null;
  onRefresh: () => void;
  onSave: (values: DiscoveryPreferences, expected: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const id = useId();
  const editButton = useRef<HTMLButtonElement>(null);
  const configured =
    hasDiscoveryPreferences(preferences) && preferences.enabled;
  const picks = recommendContests(contests, preferences, now);
  const matching = picks.filter((pick) => pick.score > 0);
  const display = matching.length ? matching : picks;
  const platforms = [
    ...new Set([
      "codeforces.com",
      "leetcode.com",
      "atcoder.jp",
      "codechef.com",
      "geeksforgeeks.org",
      "hackerearth.com",
      "hackerrank.com",
      "topcoder.com",
      "ctftime.org",
      ...contests.map((contest) => getPlatformKey(contest.host)),
      ...preferences.platforms,
    ]),
  ].sort((a, b) => getPlatform(a).name.localeCompare(getPlatform(b).name));
  return (
    <section className="personalized-discovery" aria-labelledby={`${id}-title`}>
      <div className="personalized-heading">
        <div>
          <p className="eyebrow">
            {configured ? "FOR YOU" : "YOUR NEXT ROUND"}
          </p>
          <h2 id={`${id}-title`}>
            {configured ? "Rounds worth a look." : "Make the calendar yours."}
          </h2>
          <p>
            {configured
              ? "Picked using your platforms and availability. Each label shows what fits."
              : "Choose your platforms and free time. We’ll bring the relevant rounds closer."}
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          ref={editButton}
          aria-expanded={editing}
          aria-controls={editing ? `${id}-preferences` : undefined}
          disabled={!canSave && !editing}
          onClick={() => {
            setEditing(!editing);
            setSaved(false);
          }}
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          {editing
            ? "Close preferences"
            : configured
              ? "Tune your picks"
              : "Choose preferences"}
        </button>
      </div>
      {error && (
        <p className="discovery-notice" role="alert">
          Your saved preferences couldn’t refresh. {error}{" "}
          <button type="button" className="text-link" onClick={onRefresh}>
            Retry
          </button>
        </p>
      )}
      {saved && (
        <p className="discovery-notice" role="status">
          {signedIn
            ? "Preferences saved to your account."
            : "Preferences saved in this browser."}{" "}
          Your suggestions are updated.
        </p>
      )}
      {editing && (
        <div id={`${id}-preferences`}>
          <DiscoveryPreferencesEditor
            preferences={preferences}
            platforms={platforms}
            signedIn={signedIn}
            canSave={canSave}
            onSave={async (values, expected) => {
              await onSave(values, expected);
              setSaved(true);
            }}
            onClose={() => {
              setEditing(false);
              editButton.current?.focus();
            }}
          />
        </div>
      )}
      {configured && !matching.length && picks.length > 0 && (
        <p className="discovery-notice">
          No close matches in the current schedule. Here are the next rounds;
          you can adjust your choices or browse everything below.
        </p>
      )}
      {display.length > 0 ? (
        <ContestBrowser
          initialContests={display.map((pick) => pick.contest)}
          preserveOrder
          recommendationReasons={Object.fromEntries(
            display.map((pick) => [
              pick.contest.id,
              pick.reasons.length ? pick.reasons : ["Coming up next"],
            ]),
          )}
          initialNow={now}
        />
      ) : (
        <p className="discovery-notice">
          No upcoming contests in the current feed. Your preferences are saved
          for the next update.
        </p>
      )}
      <div className="personalized-footer">
        <span>
          {configured
            ? "Preferences guide suggestions. The full calendar stays unfiltered."
            : !preferences.enabled
              ? "Personalised ranking is off. Showing the next rounds."
              : "Showing the next rounds until you choose preferences."}{" "}
          No reminders are added automatically.
        </span>
        <Link href="/contests#contest-results" className="text-link">
          Full calendar <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
export default function PersonalizedDiscovery({
  contests,
  initialNow,
}: {
  contests: Contest[];
  initialNow: number;
}) {
  const state = useDiscoveryPreferences();
  const clock = useClock();
  if (state.loading)
    return (
      <SkeletonStatus
        label="Loading your discovery preferences."
        className="personalized-discovery"
      >
        <SkeletonBlock className="h-7 w-72 mb-4" />
        <SkeletonBlock className="h-16 w-full" />
      </SkeletonStatus>
    );
  return (
    <PersonalizedDiscoveryView
      key={state.owner}
      contests={contests}
      now={clock ?? initialNow}
      preferences={state.preferences}
      signedIn={state.signedIn}
      canSave={state.canSave}
      error={state.error}
      onRefresh={() => void state.refresh()}
      onSave={state.save}
    />
  );
}
