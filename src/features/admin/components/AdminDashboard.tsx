"use client";
import AdminFeedback from "@/features/support/components/AdminFeedback";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { useAuth } from "@/features/auth/components/AuthProvider";
import PageHeading from "@/components/layout/PageHeading";
import type { AdminOverview } from "@/features/admin/server/overview";
import "@/features/admin/styles.css";
import AdminSkeleton from "@/features/admin/components/AdminSkeleton";

const formatTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "Not recorded";
const offsetTime = (seconds: number | null) =>
  seconds === null ? "—" : `${seconds > 0 ? "+" : ""}${Math.round(seconds)}s`;
const statuses = [
  "all",
  "attention",
  "pending",
  "scheduled",
  "sent",
  "delivered",
  "failed",
  "bounced",
  "uncertain",
  "cancelled",
  "expired",
];

export function AdminDashboardView({
  data,
  refreshing,
  days,
  status,
  search,
  onRefresh,
  onDays,
  onStatus,
  onSearch,
  onPage,
}: {
  data: AdminOverview;
  refreshing: boolean;
  days: number;
  status: string;
  search: string;
  onRefresh: () => void;
  onDays: (days: number) => void;
  onStatus: (status: string) => void;
  onSearch: (search: string) => void;
  onPage: (page: number) => void;
}) {
  const { summary, attention, health } = data;
  const completed = summary.delivered + summary.failed + summary.bounced;
  const rate = completed
    ? `${Math.round((summary.delivered / completed) * 100)}%`
    : "—";
  const issues =
    attention.failed + attention.overdue + attention.awaitingOutcome;
  const worker = health.lastWorker;
  const workerStale = worker
    ? new Date(data.asOf).getTime() - new Date(worker.startedAt).getTime() >
      15 * 60000
    : false;
  const workerState = !worker
    ? "Awaiting first run"
    : workerStale
      ? "No recent execution"
      : worker.success === null
        ? "Running"
        : worker.success
          ? "Responding"
          : "Last run failed";
  const metrics = [
    {
      label: "Scheduled",
      value: summary.scheduled,
      note: "Accepted by Resend, awaiting send time",
      icon: Clock3,
    },
    {
      label: "Delivered",
      value: summary.delivered,
      note: "Accepted by the recipient’s mail server",
      icon: CheckCircle2,
    },
    {
      label: "Delivery rate",
      value: rate,
      note: "Delivered ÷ (delivered + failed + bounced)",
      icon: ArrowUpRight,
    },
    {
      label: "Mean send offset",
      value: offsetTime(summary.meanSendOffset),
      note: `${summary.timingSamples} timed send events · + means late`,
      icon: Activity,
    },
  ];
  const series = Array.from({ length: days }, (_, i) => {
    const end = new Date(data.asOf).getTime() + 330 * 60000;
    const day = new Date(
      Math.floor(end / 86400000) * 86400000 - (days - 1 - i) * 86400000,
    )
      .toISOString()
      .slice(0, 10);
    return (
      data.daily.find((row) => row.day === day) ?? {
        day,
        total: 0,
        delivered: 0,
        failed: 0,
      }
    );
  });
  const max = Math.max(1, ...series.map((row) => row.total));
  return (
    <>
      <PageHeading
        eyebrow="Administration"
        title="Reminder operations"
        description="See what’s scheduled, what arrived, and what needs a closer look."
      >
        <button
          className="btn-secondary"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
            aria-hidden="true"
          />
          {refreshing ? "Refreshing" : "Refresh"}
        </button>
      </PageHeading>
      <div className="admin-toolbar">
        <p>
          <ShieldCheck size={15} aria-hidden="true" />
          Private workspace <span className="admin-divider">/</span>{" "}
          <span>All times IST</span>
        </p>
        <div className="admin-range" role="group" aria-label="Reporting period">
          {[7, 30].map((n) => (
            <button key={n} aria-pressed={days === n} onClick={() => onDays(n)}>
              Last {n} days
            </button>
          ))}
        </div>
      </div>
      <div className="admin-metrics">
        {metrics.map(({ label, value, note, icon: Icon }) => (
          <article className="admin-metric" key={label}>
            <div>
              <span>{label}</span>
              <Icon size={18} aria-hidden="true" />
            </div>
            <strong>{value}</strong>
            <p>{note}</p>
          </article>
        ))}
      </div>
      <section
        className={`admin-attention ${issues ? "admin-attention-open" : ""}`}
        aria-labelledby="attention-title"
      >
        {issues ? (
          <TriangleAlert size={20} aria-hidden="true" />
        ) : (
          <CheckCircle2 size={20} aria-hidden="true" />
        )}
        <div>
          <h2 id="attention-title">
            {issues
              ? `${issues} ${issues === 1 ? "delivery needs" : "deliveries need"} attention`
              : "No deliveries need attention"}
          </h2>
          <p>
            {attention.failed} failed, bounced or uncertain ·{" "}
            {attention.overdue} overdue pending · {attention.awaitingOutcome}{" "}
            past due with no final outcome. Across all dates.
          </p>
        </div>
        {issues > 0 && (
          <button
            className="btn-secondary"
            onClick={() => onStatus("attention")}
          >
            Review deliveries <ArrowUpRight size={15} aria-hidden="true" />
          </button>
        )}
      </section>
      <div className="admin-middle">
        <section className="admin-panel" aria-labelledby="volume-title">
          <div className="admin-panel-heading">
            <div>
              <h2 id="volume-title">Delivery activity</h2>
              <p>
                Reminders created each day, grouped by their current outcome.
              </p>
            </div>
            <span className="admin-count">{summary.total} total</span>
          </div>
          <div
            className="admin-chart"
            role="img"
            aria-label={`Daily reminder volume over ${days} days. ${summary.total} reminders created; ${summary.delivered} currently delivered. Exact values follow in the daily breakdown.`}
          >
            {series.map((row, index) => (
              <div
                className="admin-chart-column"
                key={row.day}
                title={`${row.day}: ${row.total} reminders, ${row.delivered} delivered, ${row.failed} needing attention`}
              >
                <div className="admin-chart-track">
                  <span
                    className="admin-chart-bar"
                    style={{ height: `${(row.total / max) * 100}%` }}
                  >
                    <i
                      className="admin-chart-failure"
                      style={{
                        height: `${row.total ? (row.failed / row.total) * 100 : 0}%`,
                      }}
                    />
                  </span>
                </div>
                <span>
                  {days === 7 || index % 5 === 0 || index === days - 1
                    ? row.day.slice(8)
                    : ""}
                </span>
              </div>
            ))}
            {!summary.total && (
              <p className="admin-chart-empty">
                No reminder activity in this period
              </p>
            )}
          </div>
          <div className="admin-chart-legend">
            <span>
              <i aria-hidden="true" />
              Other outcomes
            </span>
            <span>
              <i aria-hidden="true" />
              Needs attention
            </span>
          </div>
          <details className="admin-breakdown">
            <summary>Daily breakdown</summary>
            <div className="admin-table-scroll">
              <table>
                <caption className="sr-only">
                  Daily reminder outcomes in IST
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Created</th>
                    <th scope="col">Delivered</th>
                    <th scope="col">Needs attention</th>
                  </tr>
                </thead>
                <tbody>
                  {series.map((row) => (
                    <tr key={row.day}>
                      <th scope="row">{row.day}</th>
                      <td>{row.total}</td>
                      <td>{row.delivered}</td>
                      <td>{row.failed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
        <section className="admin-panel" aria-labelledby="health-title">
          <div className="admin-panel-heading">
            <div>
              <h2 id="health-title">System health</h2>
              <p>Scheduling and delivery signals</p>
            </div>
            <Activity size={18} aria-hidden="true" />
          </div>
          <dl className="admin-health">
            <div>
              <dt>Recovery schedule</dt>
              <dd>
                {health.cron
                  ? health.cron.active
                    ? health.cron.schedule === "*/5 * * * *"
                      ? "Active · every 5 minutes"
                      : `Active · ${health.cron.schedule}`
                    : "Paused"
                  : "Unavailable"}
              </dd>
              <p>
                Last SQL run: {health.cron?.lastSqlStatus ?? "Not recorded"}. A
                SQL success means the HTTP call was queued.
              </p>
            </div>
            <div>
              <dt>Recovery endpoint</dt>
              <dd
                className={
                  workerStale || worker?.success === false
                    ? "text-destructive"
                    : ""
                }
              >
                {workerState}
              </dd>
              <p>
                {worker
                  ? `Last started ${formatTime(worker.startedAt)} · ${worker.failed} failed jobs, ${worker.retried} retries · ${health.workerFailures} failed executions in this period`
                  : "Telemetry starts after this update is deployed."}
              </p>
            </div>
            <div>
              <dt>Delivery webhooks</dt>
              <dd>
                {health.webhookEvents
                  ? `${health.webhookEvents} events received`
                  : "Awaiting events"}
              </dd>
              <p>
                Last received: {formatTime(health.lastWebhook)}. No events alone
                does not indicate an outage.
              </p>
            </div>
          </dl>
        </section>
      </div>
      <section className="admin-panel admin-log" aria-labelledby="log-title">
        <div className="admin-panel-heading">
          <div>
            <h2 id="log-title">Delivery log</h2>
            <p>
              {status === "attention"
                ? "Deliveries needing review across all dates."
                : `Reminders created in the last ${days} calendar days.`}{" "}
              Recipients are masked.
            </p>
          </div>
        </div>
        <div className="admin-filters">
          <label className="admin-search">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">
              Search by contest or recipient email
            </span>
            <input
              type="search"
              placeholder="Search contest or recipient"
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              maxLength={100}
            />
          </label>
          <label className="admin-status-label">
            Status
            <select
              value={status}
              onChange={(event) => onStatus(event.target.value)}
            >
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {value === "all"
                    ? "All statuses"
                    : value === "attention"
                      ? "Needs attention"
                      : value[0].toUpperCase() + value.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {data.logs.length ? (
          <div className="admin-deliveries">
            {data.logs.map((row) => (
              <details className="admin-delivery" key={row.id}>
                <summary>
                  <div className="admin-delivery-main">
                    <Mail size={17} aria-hidden="true" />
                    <div>
                      <h3>{row.event}</h3>
                      <p>
                        {row.email} <span>· {row.reminderType} before</span>
                      </p>
                    </div>
                  </div>
                  <div className="admin-delivery-time">
                    <span>Scheduled for</span>
                    <strong>{formatTime(row.dueAt)}</strong>
                  </div>
                  <span className={`admin-badge admin-badge-${row.status}`}>
                    {row.status}
                  </span>
                  <ArrowDownRight
                    className="admin-expand"
                    size={17}
                    aria-hidden="true"
                  />
                </summary>
                <div className="admin-delivery-details">
                  <dl>
                    <div>
                      <dt>Provider send event</dt>
                      <dd>{formatTime(row.sentAt)}</dd>
                    </div>
                    <div>
                      <dt>Mail server accepted</dt>
                      <dd>{formatTime(row.deliveredAt)}</dd>
                    </div>
                    <div>
                      <dt>Send offset</dt>
                      <dd>
                        {offsetTime(
                          row.sentAt
                            ? (new Date(row.sentAt).getTime() -
                                new Date(row.dueAt).getTime()) /
                                1000
                            : null,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Processing attempts</dt>
                      <dd>{row.attempts}</dd>
                    </div>
                    <div>
                      <dt>Next eligible attempt</dt>
                      <dd>
                        {row.status === "pending"
                          ? formatTime(row.nextAttemptAt)
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>Provider ID</dt>
                      <dd className="admin-id">
                        {row.providerId ?? "Not accepted yet"}
                      </dd>
                    </div>
                  </dl>
                  {row.lastError && (
                    <p className="admin-error-detail">
                      <TriangleAlert size={15} aria-hidden="true" />
                      {row.lastError}
                    </p>
                  )}
                </div>
              </details>
            ))}
          </div>
        ) : (
          <div className="admin-empty">
            <Mail size={28} aria-hidden="true" />
            <h3>No matching deliveries</h3>
            <p>
              {search || status !== "all"
                ? "Try a different search or status."
                : "Reminders will appear here as users save them."}
            </p>
          </div>
        )}
        <div className="admin-pagination">
          <p>
            {data.totalLogs} matching{" "}
            {data.totalLogs === 1 ? "delivery" : "deliveries"}{" "}
            <span>
              · Page {data.page} of{" "}
              {Math.max(1, Math.ceil(data.totalLogs / data.pageSize))}
            </span>
          </p>
          <div>
            <button
              className="btn-secondary"
              disabled={data.page <= 1 || refreshing}
              onClick={() => onPage(data.page - 1)}
            >
              Previous
            </button>
            <button
              className="btn-secondary"
              disabled={
                data.page * data.pageSize >= data.totalLogs || refreshing
              }
              onClick={() => onPage(data.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>
      <p className="admin-footnote">
        Snapshot: {formatTime(data.asOf)} IST. Provider event times measure
        sending and mail-server acceptance, not inbox placement or reading.
        Historical events without timestamps show “Not recorded”.
      </p>
    </>
  );
}

export default function AdminDashboard() {
  const { user, loading, login, busy } = useAuth();
  const [days, setDays] = useState(7);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [snapshot, setSnapshot] = useState<{
    uid: string;
    data: AdminOverview;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<{
    uid: string;
    message: string;
    denied: boolean;
  } | null>(null);
  const [auto, setAuto] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  const refresh = useCallback(async () => {
    if (!user) return;
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;
    setRefreshing(true);
    try {
      const params = new URLSearchParams({
        days: String(days),
        status,
        search: debouncedSearch,
        page: String(page),
      });
      const response = await fetch(`/api/admin/overview?${params}`, {
        headers: { Authorization: `Bearer ${await user.getAccessToken()}` },
        signal: AbortSignal.any([next.signal, AbortSignal.timeout(20000)]),
        cache: "no-store",
      });
      const data = await response.json();
      if (next.signal.aborted) return;
      if (!response.ok) {
        setError({
          uid: user.uid,
          message: data.error || "Dashboard unavailable. Try refreshing.",
          denied: response.status === 401 || response.status === 403,
        });
        if (response.status === 401 || response.status === 403)
          setSnapshot(null);
        return;
      }
      setSnapshot({ uid: user.uid, data });
      setError(null);
    } catch {
      if (!next.signal.aborted)
        setError({
          uid: user.uid,
          message:
            "Couldn’t refresh the dashboard. Check your connection and try again.",
          denied: false,
        });
    } finally {
      if (!next.signal.aborted) setRefreshing(false);
    }
  }, [user, days, status, debouncedSearch, page]);
  useEffect(() => {
    void refresh();
    return () => controller.current?.abort();
  }, [refresh]);
  useEffect(() => {
    if (!auto || !user) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 60000);
    return () => window.clearInterval(timer);
  }, [auto, user, refresh]);
  const data =
    snapshot && user && snapshot.uid === user.uid ? snapshot.data : null;
  const failure = error?.uid === user?.uid ? error : null;
  return (
    <div className="site-container admin-dashboard pb-12">
      {loading ? (
        <AdminSkeleton contained />
      ) : !user ? (
        <div className="admin-gate">
          <ShieldCheck size={32} aria-hidden="true" />
          <h1>Admin access</h1>
          <p>
            Sign in with your administrator account to view reminder operations.
          </p>
          <button className="btn-primary" onClick={login} disabled={busy}>
            Sign in with Google
          </button>
        </div>
      ) : failure?.denied ? (
        <div className="admin-gate">
          <ShieldCheck size={32} aria-hidden="true" />
          <h1>Access restricted</h1>
          <p>{failure.message}</p>
        </div>
      ) : (
        <>
          {failure && (
            <div className="admin-refresh-error" role="alert">
              <TriangleAlert size={18} aria-hidden="true" />
              <p>
                {failure.message}
                {data ? " Showing the previous snapshot." : ""}
              </p>
              <button
                className="btn-secondary"
                onClick={() => void refresh()}
                disabled={refreshing}
              >
                Retry
              </button>
            </div>
          )}
          {data ? (
            <>
              <AdminDashboardView
                data={data}
                refreshing={refreshing}
                days={days}
                status={status}
                search={search}
                onRefresh={() => void refresh()}
                onDays={(value) => {
                  setDays(value);
                  setPage(1);
                }}
                onStatus={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
                onSearch={setSearch}
                onPage={setPage}
              />
              <AdminFeedback key={user?.uid} />
              <label className="admin-auto">
                <input
                  type="checkbox"
                  checked={auto}
                  onChange={(event) => setAuto(event.target.checked)}
                />
                Refresh every minute while this tab is visible
              </label>
            </>
          ) : (
            !failure && <AdminSkeleton contained />
          )}
        </>
      )}
    </div>
  );
}
