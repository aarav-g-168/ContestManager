import { sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { ProfileRequestError } from "@/lib/http/request-error";

export const deliveryStatuses = [
  "pending",
  "scheduled",
  "sent",
  "delivered",
  "failed",
  "bounced",
  "uncertain",
  "cancelled",
  "expired",
] as const;
export function adminQuery(params: URLSearchParams) {
  const days = Number(params.get("days") || 7);
  const page = Number(params.get("page") || 1);
  const status = params.get("status") || "all";
  const search = (params.get("search") || "").trim();
  if (
    ![7, 30].includes(days) ||
    !Number.isInteger(page) ||
    page < 1 ||
    page > 10000 ||
    search.length > 100 ||
    !["all", "attention", ...deliveryStatuses].includes(status)
  )
    throw new ProfileRequestError("Choose valid dashboard filters.", 400);
  return { days, page, status, search };
}
export type AdminQuery = ReturnType<typeof adminQuery>;
export function maskEmail(email: string) {
  const split = email.lastIndexOf("@");
  return split > 0
    ? `${email.slice(0, Math.min(2, split))}•••@${email.slice(split + 1)}`
    : "Hidden recipient";
}
function iso(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
type Summary = {
  total: number;
  pending: number;
  scheduled: number;
  sent: number;
  delivered: number;
  failed: number;
  bounced: number;
  cancelled: number;
  uncertain: number;
  expired: number;
  timingSamples: number;
  meanSendOffset: number | null;
};
type LogRow = {
  id: string;
  event: string;
  email: string;
  status: string;
  reminderType: string;
  dueAt: string;
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  attempts: number;
  nextAttemptAt: string;
  lastError: string | null;
  providerId: string | null;
};
export type AdminOverview = {
  asOf: string;
  days: number;
  summary: Summary;
  attention: {
    failed: number;
    overdue: number;
    awaitingOutcome: number;
    oldestPending: string | null;
  };
  daily: { day: string; total: number; delivered: number; failed: number }[];
  logs: LogRow[];
  totalLogs: number;
  page: number;
  pageSize: number;
  health: {
    cron: {
      active: boolean;
      schedule: string;
      lastSqlRun: string | null;
      lastSqlStatus: string | null;
    } | null;
    lastWorker: {
      startedAt: string;
      finishedAt: string | null;
      success: boolean | null;
      failed: number;
      retried: number;
    } | null;
    workerFailures: number;
    lastWebhook: string | null;
    webhookEvents: number;
  };
};
const attentionFilter = sql`(d.status in ('failed','bounced','uncertain') or (d.status='pending' and d.due_at <= now()) or (d.status in ('scheduled','sent') and d.due_at < now() - interval '10 minutes'))`;
const eventTimes = sql`left join lateral (
  select min(occurred_at) filter (where type='email.sent') as sent_at,
    min(occurred_at) filter (where type='email.delivered') as delivered_at
  from mail_events where provider_id = d.provider_id
) e on true`;

export async function getAdminOverview(
  db: Database,
  query: AdminQuery,
  now = new Date(),
): Promise<AdminOverview> {
  const offset = 330 * 60000;
  const since = new Date(
    Math.floor((now.getTime() + offset) / 86400000) * 86400000 -
      offset -
      (query.days - 1) * 86400000,
  );
  const filter = sql`${query.status === "attention" ? attentionFilter : sql`d.created_at >= ${since}`}
    ${query.status !== "all" && query.status !== "attention" ? sql`and d.status = ${query.status}` : sql``}
    ${query.search ? sql`and (d.event ilike ${"%" + query.search.replace(/[\\%_]/g, "\\$&") + "%"} or d.email ilike ${"%" + query.search.replace(/[\\%_]/g, "\\$&") + "%"})` : sql``}`;
  const [
    summary,
    attention,
    daily,
    logs,
    total,
    workers,
    workerFailures,
    webhooks,
    cron,
  ] = await Promise.all([
    db.execute(sql`select count(*)::int as total,
      count(*) filter(where d.status='pending')::int as pending,
      count(*) filter(where d.status='scheduled')::int as scheduled,
      count(*) filter(where d.status='sent')::int as sent,
      count(*) filter(where d.status='delivered')::int as delivered,
      count(*) filter(where d.status='failed')::int as failed,
      count(*) filter(where d.status='bounced')::int as bounced,
      count(*) filter(where d.status='cancelled')::int as cancelled,
      count(*) filter(where d.status='uncertain')::int as uncertain,
      count(*) filter(where d.status='expired')::int as expired,
      count(e.sent_at)::int as "timingSamples",
      avg(extract(epoch from (e.sent_at-d.due_at)))::float8 as "meanSendOffset"
      from reminder_deliveries d ${eventTimes} where d.created_at >= ${since}`),
    db.execute(sql`select count(*) filter(where d.status in ('failed','bounced','uncertain'))::int as failed,
      count(*) filter(where d.status='pending' and d.due_at <= ${now})::int as overdue,
      count(*) filter(where d.status in ('scheduled','sent') and d.due_at < ${now}::timestamptz - interval '10 minutes')::int as "awaitingOutcome",
      min(d.created_at) filter(where d.status='pending') as "oldestPending"
      from reminder_deliveries d`),
    db.execute(sql`select to_char(created_at at time zone 'Asia/Kolkata','YYYY-MM-DD') as day, count(*)::int as total,
      count(*) filter(where status='delivered')::int as delivered,
      count(*) filter(where status in ('failed','bounced','uncertain'))::int as failed
      from reminder_deliveries where created_at >= ${since} group by 1 order by 1`),
    db.execute(sql`select d.id,d.event,d.email,d.status,d.reminder_type as "reminderType", d.due_at as "dueAt", d.created_at as "createdAt",
      e.sent_at as "sentAt",e.delivered_at as "deliveredAt",d.attempts,d.next_attempt_at as "nextAttemptAt",d.last_error as "lastError",d.provider_id as "providerId"
      from reminder_deliveries d ${eventTimes} where ${filter} order by d.created_at desc,d.id limit 20 offset ${(query.page - 1) * 20}`),
    db.execute(
      sql`select count(*)::int as count from reminder_deliveries d where ${filter}`,
    ),
    db.execute(
      sql`select started_at as "startedAt", finished_at as "finishedAt",success,failed,retried from reminder_worker_runs order by started_at desc limit 1`,
    ),
    db.execute(
      sql`select count(*)::int as count from reminder_worker_runs where success=false and started_at >= ${since}`,
    ),
    db.execute(
      sql`select max(created_at) as last,count(*) filter(where created_at >= ${since})::int as count from mail_events`,
    ),
    db
      .execute(
        sql`select j.active,j.schedule,r.end_time as "lastSqlRun",r.status as "lastSqlStatus" from cron.job j left join lateral (select end_time,status from cron.job_run_details where jobid=j.jobid order by start_time desc limit 1) r on true where j.jobname='contest-manager-reminder-recovery' limit 1`,
      )
      .catch(() => ({ rows: [] })),
  ]);
  // Raw SQL drivers can return timestamp strings or Dates. Normalize both so
  // browser parsing does not depend on a driver's PostgreSQL display format.
  const lastWorker = workers.rows[0];
  const scheduler = cron.rows[0];
  return JSON.parse(
    JSON.stringify({
      asOf: now.toISOString(),
      days: query.days,
      summary: summary.rows[0],
      attention: {
        ...attention.rows[0],
        oldestPending: iso(attention.rows[0].oldestPending),
      },
      daily: daily.rows,
      logs: (logs.rows as LogRow[]).map((row) => ({
        ...row,
        dueAt: iso(row.dueAt),
        createdAt: iso(row.createdAt),
        nextAttemptAt: iso(row.nextAttemptAt),
        sentAt: iso(row.sentAt),
        deliveredAt: iso(row.deliveredAt),
        email: maskEmail(row.email),
        lastError:
          row.lastError
            ?.replace(/\b(re_|sb_secret_)[\w-]+/g, "[redacted]")
            .slice(0, 180) ?? null,
      })),
      totalLogs: total.rows[0].count,
      page: query.page,
      pageSize: 20,
      health: {
        cron: scheduler
          ? { ...scheduler, lastSqlRun: iso(scheduler.lastSqlRun) }
          : null,
        lastWorker: lastWorker
          ? {
              ...lastWorker,
              startedAt: iso(lastWorker.startedAt),
              finishedAt: iso(lastWorker.finishedAt),
            }
          : null,
        workerFailures: workerFailures.rows[0].count,
        lastWebhook: iso(webhooks.rows[0].last),
        webhookEvents: webhooks.rows[0].count,
      },
    }),
  ) as AdminOverview;
}
