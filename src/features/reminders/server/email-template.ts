export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}

type ReminderContent = {
  event: string;
  platform: string;
  date: string;
  time: string;
  reminderLabel: string;
  contestUrl: string;
  weekUrl: string;
  remindersUrl: string;
};

/** Inline styles and presentation tables remain usable when media queries are stripped. */
export function renderReminderEmail(content: ReminderContent) {
  const {
    event,
    platform,
    date,
    time,
    reminderLabel,
    contestUrl,
    weekUrl,
    remindersUrl,
  } = Object.fromEntries(
    Object.entries(content).map(([key, value]) => [key, escapeHtml(value)]),
  ) as ReminderContent;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Contest reminder</title>
  <style>
    @media screen and (max-width:620px) {
      .email-outer { padding:16px 12px!important; }
      .email-content { padding:28px 22px!important; }
      .email-heading { font-size:27px!important; line-height:34px!important; }
      .contest-content { padding:20px!important; }
      .details-cell { display:block!important; width:100%!important; padding-right:0!important; }
      .details-second { padding:16px 0 0!important; }
      .cta-table { width:100%!important; }
      .cta-link { display:block!important; padding:14px 12px!important; text-align:center!important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:#f7f4ef;color:#25211e;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
  <div style="display:none!important;visibility:hidden;mso-hide:all;max-height:0;max-width:0;opacity:0;overflow:hidden;font-size:1px;line-height:1px;">${event} · ${date} at ${time} IST. Your saved ${reminderLabel}.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f7f4ef" style="width:100%;background-color:#f7f4ef;border-collapse:collapse;">
    <tr><td align="center" class="email-outer" style="padding:32px 20px;">
      <!--[if mso]><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #ded5cc;border-radius:16px;border-spacing:0;font-family:Arial,Helvetica,sans-serif;color:#25211e;">
        <tr><td class="email-content" style="padding:36px;">
          <p style="margin:0 0 28px;font-size:13px;line-height:20px;font-weight:700;letter-spacing:1px;color:#b83d16;">CONTEST MANAGER</p>
          <h1 class="email-heading" style="margin:0 0 12px;font-size:30px;line-height:38px;font-weight:700;letter-spacing:-0.6px;color:#25211e;">Your contest starts soon.</h1>
          <p style="margin:0 0 24px;font-size:16px;line-height:26px;color:#6c625a;">Here’s the round you asked us to remind you about.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f7f4ef" style="width:100%;table-layout:fixed;background-color:#f7f4ef;border:1px solid #e6ddd4;border-radius:12px;border-spacing:0;">
            <tr><td class="contest-content" style="padding:24px;overflow-wrap:anywhere;word-break:break-word;">
              <p style="margin:0 0 8px;font-size:13px;line-height:20px;font-weight:700;color:#6c625a;">${platform}</p>
              <h2 style="margin:0 0 24px;font-size:22px;line-height:30px;font-weight:700;color:#25211e;overflow-wrap:anywhere;word-break:break-word;">${event}</h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;table-layout:fixed;">
                <tr>
                  <td class="details-cell" width="55%" valign="top" style="width:55%;padding:0 16px 0 0;">
                    <p style="margin:0 0 6px;font-size:12px;line-height:18px;color:#6c625a;">DATE</p>
                    <p style="margin:0;font-size:16px;line-height:24px;font-weight:700;color:#25211e;">${date}</p>
                  </td>
                  <td class="details-cell details-second" width="45%" valign="top" style="width:45%;padding:0;">
                    <p style="margin:0 0 6px;font-size:12px;line-height:18px;color:#6c625a;">START TIME</p>
                    <p style="margin:0;font-size:18px;line-height:24px;font-weight:700;color:#25211e;">${time} IST</p>
                    <p style="margin:4px 0 0;font-size:12px;line-height:18px;color:#6c625a;">UTC+5:30</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
          <p style="margin:14px 0 24px;font-size:13px;line-height:21px;color:#6c625a;">Your saved ${reminderLabel}.</p>
          <table role="presentation" class="cta-table" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;">
            <tr><td align="center" bgcolor="#b83d16" style="background-color:#b83d16;border-radius:8px;mso-padding-alt:14px 26px;">
              <a class="cta-link" href="${contestUrl}" style="display:inline-block;padding:14px 26px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:22px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">Open contest &rarr;</a>
            </td></tr>
          </table>
          <p style="margin:12px 0 24px;font-size:14px;line-height:22px;">
            <a href="${weekUrl}" style="display:inline-block;padding:11px 0;color:#b83d16;text-decoration:underline;">My week</a>
            <span style="padding:0 10px;color:#6c625a;" aria-hidden="true">&middot;</span>
            <a href="${remindersUrl}" style="display:inline-block;padding:11px 0;color:#b83d16;text-decoration:underline;">Manage reminders</a>
          </p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-top:1px solid #ded5cc;">
            <tr><td style="padding-top:24px;">
              <p style="margin:0 0 10px;font-size:14px;line-height:22px;color:#6c625a;">Good luck with the round,</p>
              <p style="margin:0;font-size:14px;line-height:22px;color:#25211e;"><strong>Aarav Gupta</strong><br><span style="color:#6c625a;">Founder, Contest Manager</span></p>
              <p style="margin:8px 0 0;font-size:13px;line-height:22px;"><a href="https://aarav.site" style="display:inline-block;padding:11px 0;color:#b83d16;text-decoration:underline;">Explore my other projects &rarr;</a></p>
            </td></tr>
          </table>
        </td></tr>
      </table>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;margin:0 auto;">
        <tr><td align="center" style="padding:18px 12px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;color:#6c625a;">You received this because you saved a contest reminder in Contest Manager.<br>You can change or remove future reminders from your account.</td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</body>
</html>`;
}
