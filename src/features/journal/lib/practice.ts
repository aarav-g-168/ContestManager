import { ProfileRequestError } from "@/lib/http/request-error";
import {
  validJournalDate,
  type JournalProblem,
} from "@/features/journal/lib/journal";

export const PRACTICE_PRIORITIES = {
  high: "High",
  normal: "Normal",
  low: "Low",
} as const;
export type PracticeItem = {
  entryId: string;
  revision: number;
  contest: string;
  host: string;
  topics: string[];
  problem: JournalProblem;
};
export type PracticeSnapshot = {
  items: PracticeItem[];
  total: number;
  page: number;
  pageSize: number;
  platforms: string[];
  topics: string[];
  stats: {
    pending: number;
    completed: number;
    overdue: number;
    planned: number;
  };
};
export function practiceQuery(params: URLSearchParams) {
  const q = (params.get("q") ?? "").trim();
  const platform = params.get("platform") ?? "";
  const topic = params.get("topic") ?? "";
  const status = params.get("status") || "pending";
  const priority = params.get("priority") ?? "";
  const planned = params.get("planned") ?? "";
  const page = Number(params.get("page") ?? 1);
  if (
    q.length > 120 ||
    platform.length > 100 ||
    topic.length > 32 ||
    !["pending", "completed", "all"].includes(status) ||
    (priority && !Object.hasOwn(PRACTICE_PRIORITIES, priority)) ||
    (planned && !validJournalDate(planned)) ||
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 10000
  )
    throw new ProfileRequestError("Choose valid practice filters.", 400);
  return { q, platform, topic, status, priority, planned, page };
}
export type PracticeQuery = ReturnType<typeof practiceQuery>;
export type PracticeUpdate = Pick<
  JournalProblem,
  "done" | "priority" | "plannedDate" | "takeaway"
>;
