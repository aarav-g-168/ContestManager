import { ProfileRequestError } from "@/lib/http/request-error";
import { getContestDay } from "@/features/contests/lib/calendar";

export const JOURNAL_STATUSES = {
  participated: "Participated",
  skipped: "Skipped",
  upsolving: "To upsolve",
} as const;
export const JOURNAL_TOPICS = [
  "DP",
  "Graphs",
  "Greedy",
  "Binary search",
  "Trees",
  "Math",
  "Strings",
  "Data structures",
  "Geometry",
  "Number theory",
  "Combinatorics",
  "Two pointers",
  "Bit manipulation",
  "Implementation",
  "Sorting",
];
export type JournalProblem = {
  id: string;
  title: string;
  url: string;
  done: boolean;
  priority?: "high" | "normal" | "low";
  plannedDate?: string;
  completedAt?: string | null;
  takeaway?: string;
};
export type JournalLink = { id: string; label: string; url: string };
export type JournalReview = {
  status: keyof typeof JOURNAL_STATUSES;
  rank: number | null;
  score: string;
  solved: number | null;
  wentWell: string;
  mistakes: string;
  lessons: string;
  tags: string[];
  problems: JournalProblem[];
  links: JournalLink[];
};
export type JournalValues = JournalReview & {
  title: string;
  host: string;
  date: string;
  href: string;
  contestId: number | null;
};
export type JournalEntry = {
  id: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  values: JournalValues;
};
export type JournalCandidate = {
  id: number;
  title: string;
  host: string;
  date: string;
  href: string;
  entryId: string | null;
};
export type JournalSnapshot = {
  entries: JournalEntry[];
  total: number;
  page: number;
  pageSize: number;
  candidates: JournalCandidate[];
  candidateError?: string | null;
  platforms: string[];
  topics: string[];
  stats: { total: number; participated: number; pendingProblems: number };
};
export class JournalValidationError extends ProfileRequestError {
  constructor(public fields: Record<string, string>) {
    super("Check the highlighted fields.", 400);
  }
}
export function blankJournal(date: string): JournalValues {
  return {
    title: "",
    host: "",
    date,
    href: "",
    contestId: null,
    status: "participated",
    rank: null,
    score: "",
    solved: null,
    wentWell: "",
    mistakes: "",
    lessons: "",
    tags: [],
    problems: [],
    links: [],
  };
}
export function validJournalDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return (
    Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
  );
}
export function validateJournal(
  input: unknown,
  now = new Date(),
): JournalValues {
  const errors: Record<string, string> = {};
  const raw =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  function text(value: unknown, field: string, max: number, required = false) {
    if (
      typeof value !== "string" ||
      value.trim().length > max ||
      (required && !value.trim())
    ) {
      errors[field] = required
        ? `Enter ${field === "title" ? "a contest name" : "a value"} of up to ${max} characters.`
        : `Use up to ${max} characters.`;
      return "";
    }
    return value.trim();
  }
  function url(value: unknown, field: string, required = false) {
    const result = text(value, field, 1000, required);
    if (!result) return "";
    try {
      const parsed = new URL(result);
      if (parsed.protocol !== "https:" || parsed.username || parsed.password)
        throw new Error();
      return parsed.toString();
    } catch {
      errors[field] = "Use a full HTTPS link without login details.";
      return "";
    }
  }
  function integer(value: unknown, field: string, min: number, max: number) {
    if (value === null) return null;
    if (
      typeof value !== "number" ||
      !Number.isSafeInteger(value) ||
      value < min ||
      value > max
    ) {
      errors[field] =
        `Enter a whole number from ${min} to ${max}, or leave blank.`;
      return null;
    }
    return value;
  }
  const title = text(raw.title, "title", 180, true);
  const host = text(raw.host, "host", 100, true)
    .toLowerCase()
    .replace(/^www\./, "");
  if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(host))
    errors.host = "Enter a platform domain, such as codeforces.com.";
  const date = text(raw.date, "date", 10, true);
  if (
    !validJournalDate(date) ||
    date > getContestDay(now) ||
    date < "2000-01-01"
  )
    errors.date = "Choose a real contest date from 2000 through today (IST).";
  const status = raw.status as JournalReview["status"];
  if (!Object.hasOwn(JOURNAL_STATUSES, status ?? ""))
    errors.status = "Choose your participation status.";
  const contestId =
    raw.contestId === null
      ? null
      : integer(raw.contestId, "contestId", 1, Number.MAX_SAFE_INTEGER);
  const tags =
    Array.isArray(raw.tags) && raw.tags.length <= 12
      ? [...new Set(raw.tags.map((tag) => text(tag, "tags", 32, true)))]
      : ((errors.tags = "Choose up to 12 topics."), []);
  const problems: JournalProblem[] = [];
  if (!Array.isArray(raw.problems) || raw.problems.length > 30)
    errors.problems = "Add up to 30 problems.";
  else
    for (const item of raw.problems) {
      const p =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {};
      const id = text(p.id, "problems", 64, true);
      if (
        !/^[\w-]+$/.test(id) ||
        problems.some((problem) => problem.id === id) ||
        typeof p.done !== "boolean"
      )
        errors.problems =
          "Each problem needs a unique ID and a valid completion state.";
      problems.push({
        id,
        title: text(p.title, "problems", 120, true),
        url: url(p.url, "problems"),
        done: p.done === true,
        ...(p.priority === undefined
          ? {}
          : { priority: p.priority as JournalProblem["priority"] }),
        ...(p.plannedDate === undefined
          ? {}
          : { plannedDate: text(p.plannedDate, "problems", 10) }),
        ...(p.takeaway === undefined
          ? {}
          : { takeaway: text(p.takeaway, "problems", 1000) }),
      });
      if (
        p.priority !== undefined &&
        (typeof p.priority !== "string" ||
          !["high", "normal", "low"].includes(p.priority))
      )
        errors.problems = "Choose a valid problem priority.";
      if (
        p.plannedDate !== undefined &&
        p.plannedDate !== "" &&
        (typeof p.plannedDate !== "string" ||
          !validJournalDate(p.plannedDate) ||
          p.plannedDate < "2000-01-01" ||
          p.plannedDate > "2100-12-31")
      )
        errors.problems = "Choose a real planned date between 2000 and 2100.";
    }
  const links: JournalLink[] = [];
  if (!Array.isArray(raw.links) || raw.links.length > 10)
    errors.links = "Add up to 10 reference links.";
  else
    for (const item of raw.links) {
      const l =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {};
      const id = text(l.id, "links", 64, true);
      if (!/^[\w-]+$/.test(id) || links.some((link) => link.id === id))
        errors.links = "Each reference needs a unique ID.";
      links.push({
        id,
        label: text(l.label, "links", 80, true),
        url: url(l.url, "links", true),
      });
    }
  const value: JournalValues = {
    title,
    host,
    date,
    contestId,
    status,
    href: url(raw.href, "href"),
    rank: integer(raw.rank, "rank", 1, 100000000),
    score: text(raw.score, "score", 40),
    solved: integer(raw.solved, "solved", 0, 1000),
    wentWell: text(raw.wentWell, "wentWell", 2000),
    mistakes: text(raw.mistakes, "mistakes", 2000),
    lessons: text(raw.lessons, "lessons", 2000),
    tags,
    problems,
    links,
  };
  if (Object.keys(errors).length) throw new JournalValidationError(errors);
  return value;
}
export function journalQuery(params: URLSearchParams) {
  const q = (params.get("q") ?? "").trim();
  const host = params.get("platform") ?? "";
  const status = params.get("status") ?? "";
  const topic = params.get("topic") ?? "";
  const from = params.get("from") ?? "",
    to = params.get("to") ?? "";
  const page = Number(params.get("page") ?? 1);
  if (
    q.length > 120 ||
    host.length > 100 ||
    topic.length > 32 ||
    (status && !Object.hasOwn(JOURNAL_STATUSES, status)) ||
    (from && !validJournalDate(from)) ||
    (to && !validJournalDate(to)) ||
    (from && to && from > to) ||
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 10000
  )
    throw new ProfileRequestError(
      "Choose valid journal filters and dates.",
      400,
    );
  return { q, host, status, topic, from, to, page };
}
