import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readdirSync, existsSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
// Component render tests do not need a browser CSS pipeline.
require.extensions[".css"] = () => {};
const pages = [
  "",
  "contests",
  "bookmarks",
  "reminders",
  "profile",
  "week",
  "journal",
  "progress",
  "admin",
];
for (const route of pages) {
  const Loading = require(
    `../../src/app/${route ? `${route}/` : ""}loading.tsx`,
  ).default;
  const html = renderToStaticMarkup(React.createElement(Loading));
  assert.equal(
    (html.match(/role="status"/g) ?? []).length,
    1,
    `${route || "home"}: a single named loading announcement`,
  );
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /class="sr-only">Loading /);
  assert.match(html, /class="[^"]*skeleton/);
  assert.ok(
    !/<(?:button|input|select|a)(?:\s|>)/.test(html),
    `${route || "home"}: placeholders are not interactive`,
  );
  assert.ok(!/\b(?:NaN|undefined)\b/.test(html));
  if (route === "bookmarks") assert.match(html, /<h1[^>]*>Bookmarks/);
  if (route === "reminders") assert.match(html, /<h1[^>]*>Email reminders/);
}
// New page routes must ship their own deliberate fallback, rather than inheriting the homepage.
for (const entry of readdirSync("src/app", { withFileTypes: true })) {
  if (entry.isDirectory() && existsSync(`src/app/${entry.name}/page.tsx`))
    assert.ok(
      existsSync(`src/app/${entry.name}/loading.tsx`),
      `${entry.name} is missing loading.tsx`,
    );
}
const Card =
  require("../../src/features/contests/components/ContestCard.tsx").default;
const props = {
  contest: {
    id: 123,
    event: "Loading check",
    host: "leetcode.com",
    href: "https://leetcode.com/contest/test",
    start: "2026-11-01T00:00:00Z",
    duration: 7200,
  },
  isBookmarked: false,
  hasReminder: false,
  onBookmarkToggle: async () => {},
  onReminderSet: async () => {},
  onReminderRemove: async () => {},
};
const waiting = renderToStaticMarkup(
  React.createElement(Card, { ...props, accountLoading: true }),
);
assert.match(waiting, /Loading saved actions/);
assert.ok(
  !waiting.includes('aria-label="Bookmark Loading check"'),
  "No unsaved bookmark button before account data is ready",
);
const ready = renderToStaticMarkup(
  React.createElement(Card, { ...props, accountLoading: false }),
);
assert.ok(ready.includes('aria-label="Bookmark Loading check"'));
const PracticeLoading =
  require("../../src/features/journal/components/PracticeSkeleton.tsx").default;
const practiceHtml = renderToStaticMarkup(React.createElement(PracticeLoading));
assert.match(practiceHtml, /Loading your practice queue/);
assert.match(practiceHtml, /aria-busy="true"/);
assert.equal((practiceHtml.match(/role="status"/g) ?? []).length, 1);
const GoalsLoading =
  require("../../src/features/goals/components/WeeklyGoals.tsx").WeeklyGoalsSkeleton;
const goalsHtml = renderToStaticMarkup(React.createElement(GoalsLoading));
assert.match(goalsHtml, /Loading your weekly goals/);
assert.match(goalsHtml, /aria-busy="true"/);
assert.equal((goalsHtml.match(/role="status"/g) ?? []).length, 1);
console.log(
  "Loading checks passed: all nine page fallbacks render named, busy, noninteractive skeletons; new page routes require fallbacks; saved actions wait for account data.",
);
