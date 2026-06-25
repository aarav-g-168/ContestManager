import { Resend } from "resend";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

export async function sendContestReminderEmail(
  email: string,
  contestName: string,
  contestLink: string,
  reminderType: string
) {
  await resend.emails.send({
    from:
      "Contest Manager <onboarding@resend.dev>",

    to: email,

    subject: `Reminder: ${contestName}`,

    html: `
      <h2>${contestName}</h2>

      <p>
        Your contest starts soon.
      </p>

      <p>
        Reminder Type:
        <strong>${reminderType}</strong>
      </p>

      <p>
        <a href="${contestLink}">
          Open Contest
        </a>
      </p>

      <hr />

      <p>
        Regards,<br/>
        Aarav Gupta<br/>
        Founder - Contest Manager
      </p>
    `,
  });
}