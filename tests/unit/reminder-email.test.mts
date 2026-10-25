import assert from "node:assert/strict";
import {
  reminderEmail,
  resendProvider,
  type Delivery,
  MailError,
} from "../../src/features/reminders/server/email";

const sample = {
  id: "email-template-test",
  email: "private@example.test",
  event: "Biweekly Contest 194",
  href: "https://leetcode.com/contest/biweekly-contest-194/",
  contestStart: new Date("2026-10-24T14:30:00Z"),
  reminderType: "1h",
} as Delivery;
const previousUrl = process.env.APP_URL;
try {
  delete process.env.APP_URL;
  const email = reminderEmail(sample);
  assert.equal(email.subject, "Reminder: Biweekly Contest 194");
  assert.match(email.text, /Platform: LeetCode/);
  assert.match(email.text, /08:00 PM IST \(UTC\+5:30\)/);
  assert.match(email.text, /2026/);
  assert.match(email.text, /1-hour reminder/);
  assert.match(
    email.text,
    /My week: https:\/\/contest-manager.vercel.app\/week/,
  );
  assert.match(
    email.text,
    /Manage reminders: https:\/\/contest-manager.vercel.app\/reminders/,
  );
  assert.match(email.html, /href="https:\/\/aarav.site"/);
  const unsafe = reminderEmail({
    ...sample,
    event: 'Round <script>alert("x")</script> & friends',
  });
  assert.ok(!unsafe.html.includes("<script>"));
  assert.match(unsafe.html, /&lt;script&gt;/);
  assert.match(unsafe.html, /&amp; friends/);
  for (const href of [
    "javascript:alert(1)",
    "http://example.test",
    "https://user:secret@example.test",
    "not-a-url",
  ])
    assert.throws(
      () => reminderEmail({ ...sample, href }),
      (e) => e instanceof MailError && !e.retryable,
    );
  const midnight = reminderEmail({
    ...sample,
    contestStart: new Date("2026-12-31T18:30:00Z"),
    reminderType: "24h",
  });
  assert.match(midnight.text, /1 January 2027/);
  assert.match(midnight.text, /12:00 AM IST/);
  assert.match(midnight.text, /24-hour reminder/);
  assert.ok(
    !email.html.includes(sample.email),
    "Recipient and internal delivery IDs do not appear in the email body",
  );
  assert.ok(!email.html.includes(sample.id));
  process.env.APP_URL = "https://contests.example.test/?debug=ignored";
  assert.match(
    reminderEmail(sample).text,
    /My week: https:\/\/contests.example.test\/week/,
  );
  process.env.APP_URL = "javascript:alert(1)";
  assert.match(
    reminderEmail(sample).text,
    /My week: https:\/\/contest-manager.vercel.app\/week/,
  );
  // Accepted/scheduled outbox snapshots must keep their original provider payload.
  const originalFetch = globalThis.fetch,
    previousKey = process.env.RESEND_API_KEY,
    previousFrom = process.env.RESEND_FROM;
  try {
    process.env.RESEND_API_KEY = "fake-email-template-test";
    process.env.RESEND_FROM = "Contest Manager <reminders@example.test>";
    globalThis.fetch = async (_url, options) => {
      const sent = JSON.parse(String(options?.body));
      assert.equal(sent.html, "Previously frozen HTML");
      assert.equal(
        new Headers(options?.headers).get("Idempotency-Key"),
        `reminder/${sample.id}`,
      );
      return Response.json({ id: "fake-provider-id" });
    };
    await resendProvider.schedule({
      ...sample,
      providerPayload: { html: "Previously frozen HTML", to: [sample.email] },
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
    if (previousFrom === undefined) delete process.env.RESEND_FROM;
    else process.env.RESEND_FROM = previousFrom;
  }
  console.log(
    "Reminder email checks passed: escaped content, HTTPS links, IST/year boundaries, readable plain text, private fields, app links and immutable provider snapshots. No network or emails.",
  );
} finally {
  if (previousUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = previousUrl;
}
