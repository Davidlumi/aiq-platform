/**
 * server/email.ts
 * Resend-powered email helper for AiQ.
 *
 * Three email types:
 *  1. sendApplicationConfirmation  — to applicant immediately on submission
 *  2. sendOwnerApplicationAlert    — to owner as a backup to Manus notification
 *  3. sendStatusChangeEmail        — to applicant when approved / rejected / waitlisted
 */
import { Resend } from "resend";

// ─── Constants ────────────────────────────────────────────────────────────────
const FROM_ADDRESS = "AiQ <hello@hraiq.co.uk>";
const OWNER_EMAIL  = process.env.OWNER_ALERT_EMAIL ?? "";
const SITE_URL     = "https://hraiq.co.uk";

// Colours
const NAVY   = "#0F172A";
const GREEN  = "#22C55E";
const SLATE  = "#1E293B";
const MUTED  = "#94A3B8";
const WHITE  = "#FFFFFF";

// ─── Resend client (lazy — only instantiated when key is present) ─────────────
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

// ─── Shared layout wrapper ────────────────────────────────────────────────────
function emailLayout(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>AiQ</title>
</head>
<body style="margin:0;padding:0;background:${NAVY};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${NAVY};padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;">
              <a href="${SITE_URL}" style="text-decoration:none;">
                <span style="font-size:28px;font-weight:800;color:${WHITE};letter-spacing:-0.5px;">A<span style="color:${GREEN};">i</span>Q</span>
              </a>
            </td>
          </tr>
          <!-- Body card -->
          <tr>
            <td style="background:${SLATE};border-radius:12px;padding:40px;border:1px solid rgba(255,255,255,0.08);">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="color:${MUTED};font-size:12px;margin:0;">
                AiQ — Enterprise HR Capability Intelligence &nbsp;·&nbsp;
                <a href="${SITE_URL}" style="color:${MUTED};text-decoration:underline;">${SITE_URL}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Helper: heading ─────────────────────────────────────────────────────────
function h1(text: string) {
  return `<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${WHITE};line-height:1.3;">${text}</h1>`;
}
function p(text: string) {
  return `<p style="margin:0 0 16px;font-size:15px;color:#CBD5E1;line-height:1.6;">${text}</p>`;
}
function divider() {
  return `<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0;" />`;
}
function greenBadge(text: string) {
  return `<span style="display:inline-block;background:rgba(34,197,94,0.12);color:${GREEN};font-size:12px;font-weight:600;padding:4px 10px;border-radius:20px;border:1px solid rgba(34,197,94,0.25);">${text}</span>`;
}
function ctaButton(label: string, href: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:8px;padding:12px 28px;background:${GREEN};color:#0A0F1A;font-size:14px;font-weight:700;border-radius:8px;text-decoration:none;">${label}</a>`;
}
function stepRow(num: string, title: string, desc: string) {
  return `<tr>
    <td style="padding:8px 0;vertical-align:top;">
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="width:28px;height:28px;background:rgba(34,197,94,0.12);border-radius:50%;text-align:center;vertical-align:middle;font-size:11px;font-weight:700;color:${GREEN};">${num}</td>
        <td style="padding-left:12px;">
          <p style="margin:0;font-size:14px;font-weight:600;color:${WHITE};">${title}</p>
          <p style="margin:2px 0 0;font-size:13px;color:${MUTED};">${desc}</p>
        </td>
      </tr></table>
    </td>
  </tr>`;
}

// ─── 1. Applicant confirmation email ─────────────────────────────────────────
export async function sendApplicationConfirmation(opts: {
  to: string;
  firstName: string;
  companyName: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return; // silently skip if key not configured

  const body = `
    ${greenBadge("Application received")}
    <br/><br/>
    ${h1(`Thank you, ${opts.firstName}.`)}
    ${p(`We have received your application for <strong style="color:${WHITE};">${opts.companyName}</strong> to join the AiQ beta programme.`)}
    ${p("We respond to every application within five business days — even if the answer is no. If you look like a fit, we will be in touch to arrange a one-hour conversation.")}
    ${divider()}
    <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:${WHITE};">What happens next</p>
    <table cellpadding="0" cellspacing="0" width="100%">
      ${stepRow("01", "Review", "We assess your application against our beta criteria within five business days.")}
      ${stepRow("02", "Conversation", "If you look like a fit, we schedule a one-hour call to understand your specific situation.")}
      ${stepRow("03", "Pilot", "If we both want to proceed, we agree the commercial structure and begin onboarding.")}
      ${stepRow("04", "Loop", "The loop runs — quarterly reviews, roadmap input, and close collaboration throughout.")}
    </table>
    ${divider()}
    ${p(`In the meantime, if you have any questions you can reply directly to this email.`)}
    ${ctaButton("Visit AiQ", SITE_URL)}
  `;

  await resend.emails.send({
    from:    FROM_ADDRESS,
    to:      opts.to,
    subject: `AiQ beta application received — ${opts.companyName}`,
    html:    emailLayout(body),
  });
}

// ─── 2. Owner alert email ─────────────────────────────────────────────────────
export async function sendOwnerApplicationAlert(opts: {
  firstName: string;
  lastName: string;
  title: string;
  companyName: string;
  sector: string;
  companySize: string;
  hrTeamSize: number;
  contactEmail: string;
  useCase: string;
  linkedinUrl?: string | null;
}): Promise<void> {
  const resend = getResend();
  if (!resend || !OWNER_EMAIL) return;

  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 0;font-size:13px;color:${MUTED};width:140px;vertical-align:top;">${label}</td><td style="padding:6px 0;font-size:13px;color:${WHITE};vertical-align:top;">${value}</td></tr>`;

  const body = `
    ${greenBadge("New beta application")}
    <br/><br/>
    ${h1(`${opts.firstName} ${opts.lastName} — ${opts.companyName}`)}
    <table cellpadding="0" cellspacing="0" width="100%">
      ${row("Name",       `${opts.firstName} ${opts.lastName}`)}
      ${row("Title",      opts.title)}
      ${row("Email",      `<a href="mailto:${opts.contactEmail}" style="color:${GREEN};">${opts.contactEmail}</a>`)}
      ${row("Company",    opts.companyName)}
      ${row("Sector",     opts.sector)}
      ${row("Org size",   opts.companySize)}
      ${row("HR team",    `${opts.hrTeamSize} professionals`)}
      ${opts.linkedinUrl ? row("LinkedIn", `<a href="${opts.linkedinUrl}" style="color:${GREEN};">View profile</a>`) : ""}
    </table>
    ${divider()}
    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:${WHITE};">Use case</p>
    <p style="margin:0 0 16px;font-size:13px;color:#CBD5E1;line-height:1.6;">${opts.useCase.substring(0, 500)}${opts.useCase.length > 500 ? "…" : ""}</p>
    ${ctaButton("Review in admin panel", `${SITE_URL}/admin/applications`)}
  `;

  await resend.emails.send({
    from:    FROM_ADDRESS,
    to:      OWNER_EMAIL,
    subject: `New AiQ beta application — ${opts.companyName}`,
    html:    emailLayout(body),
  });
}

// ─── 3. Status change email ───────────────────────────────────────────────────
export async function sendStatusChangeEmail(opts: {
  to: string;
  firstName: string;
  companyName: string;
  status: "approved" | "rejected" | "waitlisted";
  notes?: string | null;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  let subject: string;
  let badge: string;
  let heading: string;
  let bodyText: string;
  let cta: string;

  if (opts.status === "approved") {
    subject  = `AiQ beta — you are in, ${opts.firstName}`;
    badge    = greenBadge("Application approved");
    heading  = `Welcome to the AiQ beta, ${opts.firstName}.`;
    bodyText = `Your application for <strong style="color:${WHITE};">${opts.companyName}</strong> has been approved. We will be in touch within the next two business days to arrange your onboarding call and agree the pilot structure.`;
    cta      = ctaButton("Visit AiQ", SITE_URL);
  } else if (opts.status === "waitlisted") {
    subject  = `AiQ beta — you are on the waitlist`;
    badge    = `<span style="display:inline-block;background:rgba(204,187,68,0.12);color:#CCBB44;font-size:12px;font-weight:600;padding:4px 10px;border-radius:20px;border:1px solid rgba(204,187,68,0.25);">Waitlisted</span>`;
    heading  = `You are on the waitlist, ${opts.firstName}.`;
    bodyText = `Thank you for applying for <strong style="color:${WHITE};">${opts.companyName}</strong>. We do not have a cohort place available right now, but you are on our waitlist and we will be in touch as soon as one opens up.`;
    cta      = ctaButton("Visit AiQ", SITE_URL);
  } else {
    subject  = `AiQ beta application — update for ${opts.companyName}`;
    badge    = `<span style="display:inline-block;background:rgba(239,68,68,0.12);color:#F87171;font-size:12px;font-weight:600;padding:4px 10px;border-radius:20px;border:1px solid rgba(239,68,68,0.25);">Application unsuccessful</span>`;
    heading  = `Thank you for applying, ${opts.firstName}.`;
    bodyText = `After reviewing your application for <strong style="color:${WHITE};">${opts.companyName}</strong>, we do not think we are the right fit at this stage. We appreciate you taking the time to apply and we wish you well.`;
    cta      = "";
  }

  const notesBlock = opts.notes
    ? `${divider()}<p style="margin:0 0 8px;font-size:13px;font-weight:600;color:${WHITE};">A note from the team</p><p style="margin:0;font-size:13px;color:#CBD5E1;line-height:1.6;">${opts.notes}</p>`
    : "";

  const body = `
    ${badge}
    <br/><br/>
    ${h1(heading)}
    ${p(bodyText)}
    ${notesBlock}
    ${divider()}
    ${cta}
  `;

  await resend.emails.send({
    from:    FROM_ADDRESS,
    to:      opts.to,
    subject,
    html:    emailLayout(body),
  });
}

// ─── Password Reset Email ────────────────────────────────────────────────────
/**
 * Sends a password reset link to the user.
 * Silently skips if RESEND_API_KEY is not configured.
 */
export async function sendPasswordResetEmail(opts: {
  to: string;
  firstName: string;
  resetUrl: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return; // silently skip if key not configured

  const subject = "Reset your AiQ password";
  const body = `
    ${h1("Reset your password")}
    ${p(`Hi ${opts.firstName || "there"},`)}
    ${p("We received a request to reset your AiQ password. Click the button below to choose a new password. This link expires in 1 hour.")}
    ${ctaButton("Reset password", opts.resetUrl)}
    ${divider()}
    ${p("If you didn't request a password reset, you can safely ignore this email — your password won't change.")}
  `;

  await resend.emails.send({
    from:    FROM_ADDRESS,
    to:      opts.to,
    subject,
    html:    emailLayout(body),
  });
}
