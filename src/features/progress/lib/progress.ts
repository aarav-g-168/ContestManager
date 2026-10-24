import { getContestDay } from "@/features/contests/lib/calendar";
import { ProfileRequestError } from "@/lib/http/request-error";

export function progressQuery(params: URLSearchParams) {
  const months = Number(params.get("months") || 6);
  const platform = (params.get("platform") || "").trim();
  if (
    ![3, 6, 12].includes(months) ||
    platform.length > 100 ||
    (platform && !/^[a-z0-9.-]+$/.test(platform))
  )
    throw new ProfileRequestError(
      "Choose a valid progress period and platform.",
      400,
    );
  return { months, platform };
}
export type ProgressQuery = ReturnType<typeof progressQuery>;
export type ProgressRecord = {
  id: string;
  title: string;
  host: string;
  date: string;
  status: string;
  solved: number | null;
  rank: number | null;
  problemStates: boolean[];
  tags: string[];
};
export type ProgressTotals = {
  entries: number;
  participated: number;
  skipped: number;
  upsolving: number;
  solved: number;
  solvedRecorded: number;
  checklistTotal: number;
  checklistDone: number;
};
export type ProgressMonth = ProgressTotals & {
  key: string;
  from: string;
  to: string;
  label: string;
};
export type ProgressSnapshot = {
  practice?: {
    completed: number;
    monthly: { key: string; label: string; completed: number }[];
  };
  asOf: string;
  months: number;
  platform: string;
  from: string;
  to: string;
  journalCount: number;
  availablePlatforms: string[];
  totals: ProgressTotals;
  activeMonths: number;
  monthly: ProgressMonth[];
  platforms: (ProgressTotals & { host: string; bestRank: number | null })[];
  topics: { topic: string; entries: number }[];
  recent: Pick<
    ProgressRecord,
    "id" | "title" | "host" | "date" | "status" | "solved" | "rank"
  >[];
};
const blank = (): ProgressTotals => ({
  entries: 0,
  participated: 0,
  skipped: 0,
  upsolving: 0,
  solved: 0,
  solvedRecorded: 0,
  checklistTotal: 0,
  checklistDone: 0,
});
export function progressWindow(months: number, now: Date) {
  const today = getContestDay(now);
  const [year, month] = today.split("-").map(Number);
  const monthly: ProgressMonth[] = Array.from(
    { length: months },
    (_, index) => {
      const date = new Date(Date.UTC(year, month - months + index, 1));
      const key = date.toISOString().slice(0, 7);
      const end = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
      )
        .toISOString()
        .slice(0, 10);
      return {
        ...blank(),
        key,
        from: `${key}-01`,
        to: end < today ? end : today,
        label: date.toLocaleDateString("en-GB", {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }),
      };
    },
  );
  return { from: monthly[0].from, to: today, monthly };
}
function add(total: ProgressTotals, row: ProgressRecord) {
  total.entries++;
  if (row.status === "participated") {
    total.participated++;
    if (
      row.solved !== null &&
      Number.isInteger(row.solved) &&
      row.solved >= 0
    ) {
      total.solved += row.solved;
      total.solvedRecorded++;
    }
  } else if (row.status === "skipped") total.skipped++;
  else if (row.status === "upsolving") total.upsolving++;
  total.checklistTotal += row.problemStates.length;
  total.checklistDone += row.problemStates.filter(
    (done) => done === true,
  ).length;
}
export function aggregateProgress(
  records: ProgressRecord[],
  query: ProgressQuery,
  now: Date,
  journalCount: number,
  availablePlatforms: string[],
): ProgressSnapshot {
  const window = progressWindow(query.months, now);
  const rows = records.filter(
    (row) =>
      row.date >= window.from &&
      row.date <= window.to &&
      (!query.platform || row.host === query.platform),
  );
  const totals = blank();
  const platforms = new Map<
    string,
    ProgressTotals & { host: string; bestRank: number | null }
  >();
  const topics = new Map<string, number>();
  for (const row of rows) {
    add(totals, row);
    const monthly = window.monthly.find(
      (month) => month.key === row.date.slice(0, 7),
    );
    if (monthly) add(monthly, row);
    const platform = platforms.get(row.host) ?? {
      ...blank(),
      host: row.host,
      bestRank: null,
    };
    add(platform, row);
    if (row.status === "participated" && row.rank !== null && row.rank > 0)
      platform.bestRank =
        platform.bestRank === null
          ? row.rank
          : Math.min(row.rank, platform.bestRank);
    platforms.set(row.host, platform);
    for (const topic of new Set(row.tags))
      topics.set(topic, (topics.get(topic) ?? 0) + 1);
  }
  return {
    asOf: now.toISOString(),
    months: query.months,
    platform: query.platform,
    from: window.from,
    to: window.to,
    journalCount,
    availablePlatforms,
    totals,
    activeMonths: window.monthly.filter((month) => month.participated > 0)
      .length,
    monthly: window.monthly,
    platforms: [...platforms.values()].sort(
      (a, b) => b.participated - a.participated || a.host.localeCompare(b.host),
    ),
    topics: [...topics]
      .map(([topic, entries]) => ({ topic, entries }))
      .sort((a, b) => b.entries - a.entries || a.topic.localeCompare(b.topic)),
    recent: [...rows]
      .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
      .slice(0, 5)
      .map(({ id, title, host, date, status, solved, rank }) => ({
        id,
        title,
        host,
        date,
        status,
        solved,
        rank,
      })),
  };
}
export function progressJournalLink(
  snapshot: Pick<ProgressSnapshot, "from" | "to" | "platform">,
  extra: {
    from?: string;
    to?: string;
    platform?: string;
    topic?: string;
    q?: string;
    status?: string;
  } = {},
) {
  const params = new URLSearchParams({
    from: snapshot.from,
    to: snapshot.to,
    platform: snapshot.platform,
    ...extra,
  });
  for (const [key, value] of [...params]) if (!value) params.delete(key);
  return `/journal?${params.toString()}`;
}
