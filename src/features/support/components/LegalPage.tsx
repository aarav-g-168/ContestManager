import Link from "next/link";
import { SUPPORT_EMAIL } from "@/features/support/lib/contact";
import "@/features/account/styles.css";
export default function LegalPage({ kind }: { kind: "privacy" | "terms" }) {
  return (
    <article className="site-container account-page legal-page">
      <header className="account-heading">
        <p className="eyebrow">CONTEST MANAGER · UPDATED 25 OCTOBER 2026</p>
        <h1>{kind === "privacy" ? "Privacy policy." : "Terms of use."}</h1>
      </header>
      {kind === "privacy" ? (
        <>
          <p>
            Contest Manager is built and operated by Aarav Gupta. This page
            describes the data used by the application. Contact{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with privacy
            questions.
          </p>
          <h2>What we save</h2>
          <p>
            When you sign in with Google, we receive your verified account
            identity, email, name and profile photo reference. We store the
            profile information you choose to add, uploaded profile photos,
            bookmarks, reminder preferences and delivery history, journal notes
            and problem checklists, weekly goals, and feedback you submit. Your
            journal, feedback and uploaded photos are private to your account
            and authorized administrators.
          </p>
          <h2>How it is used</h2>
          <p>
            We use this information to provide your account, display your saved
            work, send the reminders you request, calculate journal-based
            progress, respond to feedback, prevent abuse and troubleshoot
            failures. We do not sell personal information or use journal content
            for advertising.
          </p>
          <h2>Services involved</h2>
          <p>
            Supabase provides authentication, PostgreSQL and photo storage.
            Google provides sign-in. Vercel hosts the application. Resend
            receives your email address and contest/reminder details to send
            requested messages and report delivery outcomes. CLIST supplies
            public contest listings. GitHub runs operational checks. Each
            service handles its own infrastructure logs under its own policies.
          </p>
          <h2>Browser storage and links</h2>
          <p>
            The browser stores your sign-in session, appearance preference and a
            private status receipt if you request account deletion.
            Authentication can use browser storage or cookies as required by the
            sign-in flow. External contest, calendar, portfolio and social links
            open services with separate privacy policies. We do not currently
            add a separate advertising or behavioral analytics tracker.
          </p>
          <h2>Retention and deletion</h2>
          <p>
            Application data is retained while your account exists unless you
            delete individual entries or request account deletion. Account
            deletion first blocks new changes and cancels pending email
            reminders. Cleanup may take multiple background-worker passes; an
            uncertain email cancellation can delay completion and require
            support. We then delete your photo files, application records and
            Supabase login. Emails already sent cannot be recalled. Provider
            logs follow provider retention, and an encrypted backup made before
            deletion may retain a copy until that backup expires. The owner’s
            backup policy is a maximum of 30 days; deletion requests must also
            be honored when restoring a backup.
          </p>
          <p>
            Completed deletion receipts contain no account identifier and expire
            after seven days. Operational worker history is kept for up to 30
            days. Request-limit records are pruned after their expiry. Feedback
            is kept with your account; ask support to remove a message
            separately. Don’t put secrets or sensitive personal information in
            notes or feedback.
          </p>
          <h2>Your controls</h2>
          <p>
            Open <Link href="/settings">Settings & privacy</Link> to pause
            emails, download an account JSON, journal CSV or uploaded photo, and
            request permanent deletion. Delete journal entries from Journal. If
            you cannot sign in or need help correcting or removing data, email
            the support address above. You can revoke Google access in your
            Google account settings.
          </p>
        </>
      ) : (
        <>
          <p>
            By using Contest Manager, you agree to use it responsibly. It is an
            independent tool for discovering programming contests, planning
            participation and keeping private notes.
          </p>
          <h2>Your account and content</h2>
          <p>
            Keep your Google account secure. You remain responsible for the
            notes, links, photos and feedback you submit. Only upload content
            you have permission to use. Do not submit illegal, abusive or
            harmful content, impersonate others, attack the service, bypass
            limits or automate bulk email creation. Access may be restricted to
            protect users and the service.
          </p>
          <h2>Contest information and reminders</h2>
          <p>
            Listings come from external sources and can change. Verify
            registration rules, eligibility and start times on the official
            contest website. Reminder delivery depends on providers, the network
            and recipient mail systems; arrival at an exact time or in the inbox
            is not guaranteed. Keep another reminder for events that matter to
            you. Journal results are entered manually and are not official
            rankings.
          </p>
          <h2>Availability and limits</h2>
          <p>
            The application is provided as available, without a service-level
            guarantee. Free infrastructure may pause, impose limits or become
            unavailable. We may change features or apply account limits to
            maintain service. There is no payment or subscription flow in the
            application. We do not promise uninterrupted availability, loss-free
            storage or guaranteed email delivery.
          </p>
          <h2>Your data and leaving</h2>
          <p>
            You can export your data and request account deletion in{" "}
            <Link href="/settings">Settings</Link>. Keep your own copies of
            important work. See the <Link href="/privacy">privacy policy</Link>{" "}
            for how data and email cancellations are handled.
          </p>
          <h2>Questions and changes</h2>
          <p>
            Contact Aarav Gupta at{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We will
            update the date on this page when these terms change. These terms do
            not exclude rights that applicable law does not allow us to exclude.
          </p>
        </>
      )}
      <footer className="account-footer">
        <Link href="/support">Help & feedback</Link>
        <Link href={kind === "privacy" ? "/terms" : "/privacy"}>
          {kind === "privacy" ? "Terms of use" : "Privacy policy"}
        </Link>
      </footer>
    </article>
  );
}
