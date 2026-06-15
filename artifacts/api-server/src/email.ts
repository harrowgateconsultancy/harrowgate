import nodemailer from "nodemailer";

const NOTIFY_TO = "harrowgateconsultancy@gmail.com";

function createTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

// ── Notify admin: new application ──────────────────────────────────────────
export async function sendNewApplicationEmail(opts: {
  name: string; email: string | null; passportNumber: string;
  dateOfBirth: string; docCount: number;
}) {
  const transport = createTransport();
  if (!transport) { console.warn("[email] credentials not set — skipping"); return; }
  try {
    await transport.sendMail({
      from: `"HARROWGATE Portal" <${process.env.GMAIL_USER}>`,
      to: NOTIFY_TO,
      subject: `Student Application Submission - Website — ${opts.name}`,
      html: adminHtml("New Application Submitted", `A student has submitted a new visa application.`, [
        ["Full Name", opts.name], ["Email", opts.email || "—"],
        ["Passport Number", opts.passportNumber], ["Date of Birth", opts.dateOfBirth],
        ["Documents Uploaded", String(opts.docCount)],
      ], "Review in Admin Panel →"),
    });
    console.log(`[email] New application notification sent for ${opts.name}`);
  } catch (err) { console.error("[email] Failed:", err); }
}

// ── Notify admin: payment receipt uploaded ──────────────────────────────────
export async function sendReceiptUploadEmail(opts: {
  name: string; email: string | null; passportNumber: string;
  receiptFileName: string; submissionId: number;
}) {
  const transport = createTransport();
  if (!transport) { console.warn("[email] credentials not set — skipping"); return; }
  try {
    await transport.sendMail({
      from: `"HARROWGATE Portal" <${process.env.GMAIL_USER}>`,
      to: NOTIFY_TO,
      subject: `Student Application Submission - Website (Payment Receipt) — ${opts.name}`,
      html: adminHtml("💳 Payment Receipt Received", `A student has uploaded their payment receipt and is awaiting confirmation.`, [
        ["Full Name", opts.name], ["Email", opts.email || "—"],
        ["Passport Number", opts.passportNumber], ["Receipt File", opts.receiptFileName],
      ], "Confirm Payment →"),
    });
    console.log(`[email] Receipt upload notification sent for ${opts.name}`);
  } catch (err) { console.error("[email] Failed:", err); }
}

// ── Notify admin: 2nd payment receipt uploaded ─────────────────────────────
export async function sendSecondReceiptUploadEmail(opts: {
  name: string; email: string | null; passportNumber: string;
  receiptFileName: string; submissionId: number;
}) {
  const transport = createTransport();
  if (!transport) { console.warn("[email] credentials not set — skipping"); return; }
  try {
    await transport.sendMail({
      from: `"HARROWGATE Portal" <${process.env.GMAIL_USER}>`,
      to: NOTIFY_TO,
      subject: `Student Application Submission - Website (2nd Payment Receipt) — ${opts.name}`,
      html: adminHtml("💳 2nd Payment Receipt Received", `A student has uploaded their second payment receipt and is awaiting confirmation.`, [
        ["Full Name", opts.name], ["Email", opts.email || "—"],
        ["Passport Number", opts.passportNumber], ["Receipt File", opts.receiptFileName],
      ], "Confirm 2nd Payment →"),
    });
    console.log(`[email] 2nd receipt upload notification sent for ${opts.name}`);
  } catch (err) { console.error("[email] Failed:", err); }
}

// ── Notify student: application approved ────────────────────────────────────
export async function sendApprovalEmail(opts: {
  name: string; studentEmail: string; portalUrl?: string;
}) {
  if (!opts.studentEmail) { console.warn("[email] No student email — skipping approval email"); return; }
  const transport = createTransport();
  if (!transport) { console.warn("[email] credentials not set — skipping"); return; }
  try {
    await transport.sendMail({
      from: `"HARROWGATE Consultancy" <${process.env.GMAIL_USER}>`,
      to: opts.studentEmail,
      subject: `Application Approved — HARROWGATE Consultancy`,
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#0f2d18;border-radius:12px;overflow:hidden">
          <div style="background:#0a2010;padding:24px 32px;text-align:center;border-bottom:1px solid rgba(162,137,89,0.2)">
            <h1 style="margin:0;color:#a28959;font-size:20px;letter-spacing:2px">HARROWGATE</h1>
            <p style="margin:4px 0 0;color:rgba(162,137,89,0.5);font-size:11px;letter-spacing:3px;text-transform:uppercase">Consultancy</p>
          </div>
          <div style="padding:32px">
            <h2 style="margin:0 0 8px;color:#4ade80;font-size:22px">✅ Your Application Has Been Approved</h2>
            <p style="margin:0 0 20px;color:rgba(162,137,89,0.7);font-size:15px;line-height:1.6">Dear ${opts.name},</p>
            <p style="margin:0 0 20px;color:rgba(162,137,89,0.7);font-size:15px;line-height:1.6">
              We are pleased to inform you that your student visa application has been reviewed and <strong style="color:#4ade80">approved</strong> by our consultants at HARROWGATE Consultancy.
            </p>
            <p style="margin:0 0 20px;color:rgba(162,137,89,0.7);font-size:15px;line-height:1.6">
              Please log in to your student portal and <strong style="color:#a28959">wait patiently for further instructions</strong>. Our team will be in touch with the next steps shortly.
            </p>
            <div style="background:rgba(74,222,128,0.06);border:1px solid rgba(74,222,128,0.18);border-radius:10px;padding:16px 20px;margin:24px 0;font-size:14px;color:rgba(162,137,89,0.65);line-height:1.6">
              If you have any urgent enquiries, please do not hesitate to contact us directly by replying to this email.
            </div>
            ${opts.portalUrl ? `
            <div style="margin-top:24px;text-align:center">
              <a href="${opts.portalUrl}" style="display:inline-block;background:#a28959;color:#0f2d18;padding:12px 28px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.5px">
                View Your Portal →
              </a>
            </div>` : ""}
          </div>
          <div style="padding:16px 32px;text-align:center;border-top:1px solid rgba(162,137,89,0.1)">
            <p style="margin:0;color:rgba(162,137,89,0.3);font-size:11px">HARROWGATE Consultancy · Hong Kong</p>
          </div>
        </div>
      `,
    });
    console.log(`[email] Approval email sent to ${opts.studentEmail}`);
  } catch (err) { console.error("[email] Failed to send approval email:", err); }
}

// ── Notify admin: student resubmitted ───────────────────────────────────────
export async function sendResubmitEmail(opts: {
  name: string; email: string | null; passportNumber: string;
  dateOfBirth: string; docCount: number; submissionId: number;
}) {
  const transport = createTransport();
  if (!transport) { console.warn("[email] credentials not set — skipping"); return; }
  try {
    await transport.sendMail({
      from: `"HARROWGATE Portal" <${process.env.GMAIL_USER}>`,
      to: NOTIFY_TO,
      subject: `Student Application Resubmitted — ${opts.name}`,
      html: adminHtml(
        "📤 Application Resubmitted",
        `A student has uploaded additional documents and resubmitted their application for review.`,
        [
          ["Full Name", opts.name],
          ["Email", opts.email || "—"],
          ["Passport Number", opts.passportNumber],
          ["Date of Birth", opts.dateOfBirth],
          ["Documents on File", String(opts.docCount)],
        ],
        "Review Resubmission →"
      ),
    });
    console.log(`[email] Resubmit notification sent for ${opts.name}`);
  } catch (err) { console.error("[email] Failed to send resubmit email:", err); }
}

// ── Notify student: additional documents requested ───────────────────────────
export async function sendDocsRequestedEmail(opts: {
  name: string; studentEmail: string; adminNotes?: string; portalUrl?: string;
}) {
  if (!opts.studentEmail) return;
  const transport = createTransport();
  if (!transport) return;
  try {
    await transport.sendMail({
      from: `"HARROWGATE Consultancy" <${process.env.GMAIL_USER}>`,
      to: opts.studentEmail,
      subject: `Additional Documents Required — HARROWGATE Consultancy`,
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#0f2d18;border-radius:12px;overflow:hidden">
          <div style="background:#0a2010;padding:24px 32px;text-align:center;border-bottom:1px solid rgba(162,137,89,0.2)">
            <h1 style="margin:0;color:#a28959;font-size:20px;letter-spacing:2px">HARROWGATE</h1>
            <p style="margin:4px 0 0;color:rgba(162,137,89,0.5);font-size:11px;letter-spacing:3px;text-transform:uppercase">Consultancy</p>
          </div>
          <div style="padding:32px">
            <h2 style="margin:0 0 8px;color:#fb923c;font-size:20px">📎 Additional Documents Required</h2>
            <p style="margin:0 0 20px;color:rgba(162,137,89,0.7);font-size:15px;line-height:1.6">Dear ${opts.name},</p>
            <p style="margin:0 0 20px;color:rgba(162,137,89,0.7);font-size:15px;line-height:1.6">
              Our consultants have reviewed your application and require additional documents before we can proceed.
            </p>
            ${opts.adminNotes ? `
            <div style="background:rgba(251,146,60,0.06);border:1px solid rgba(251,146,60,0.2);border-radius:10px;padding:16px 20px;margin:16px 0;font-size:14px;color:rgba(251,146,60,0.8);line-height:1.6">
              <strong>Note from consultant:</strong><br>${opts.adminNotes}
            </div>` : ""}
            <p style="margin:16px 0;color:rgba(162,137,89,0.7);font-size:14px;line-height:1.6">
              Please log in to your portal, upload the required documents, and click <strong style="color:#a28959">"Re-submit Application"</strong>.
            </p>
            ${opts.portalUrl ? `
            <div style="margin-top:24px;text-align:center">
              <a href="${opts.portalUrl}" style="display:inline-block;background:#a28959;color:#0f2d18;padding:12px 28px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:700">
                Upload Documents →
              </a>
            </div>` : ""}
          </div>
          <div style="padding:16px 32px;text-align:center;border-top:1px solid rgba(162,137,89,0.1)">
            <p style="margin:0;color:rgba(162,137,89,0.3);font-size:11px">HARROWGATE Consultancy · Hong Kong</p>
          </div>
        </div>
      `,
    });
    console.log(`[email] Docs-requested email sent to ${opts.studentEmail}`);
  } catch (err) { console.error("[email] Failed:", err); }
}

// ── Notify student: mock interview invite ────────────────────────────────────
export async function sendInterviewInviteEmail(opts: {
  name: string; studentEmail: string; zoomLink: string;
  dateTime: string; refCode: string; notes?: string;
}) {
  if (!opts.studentEmail) return;
  const transport = createTransport();
  if (!transport) return;
  try {
    await transport.sendMail({
      from: `"HARROWGATE Consultancy" <${process.env.GMAIL_USER}>`,
      to: opts.studentEmail,
      replyTo: process.env.GMAIL_USER,
      headers: {
        "X-Priority": "1",
        "X-MSMail-Priority": "High",
        "Importance": "high",
      },
      subject: `Mock Interview Invitation — HARROWGATE Consultancy`,
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#0f2d18;border-radius:12px;overflow:hidden">
          <div style="background:#0a2010;padding:24px 32px;text-align:center;border-bottom:1px solid rgba(162,137,89,0.2)">
            <h1 style="margin:0;color:#a28959;font-size:20px;letter-spacing:2px">HARROWGATE</h1>
            <p style="margin:4px 0 0;color:rgba(162,137,89,0.5);font-size:11px;letter-spacing:3px;text-transform:uppercase">Consultancy</p>
          </div>
          <div style="padding:32px">
            <h2 style="margin:0 0 4px;color:#a28959;font-size:22px">🎥 Mock Interview Invitation</h2>
            <p style="margin:0 0 24px;color:rgba(162,137,89,0.55);font-size:13px">Reference: ${opts.refCode}</p>
            <p style="margin:0 0 20px;color:rgba(162,137,89,0.7);font-size:15px;line-height:1.6">Dear ${opts.name},</p>
            <p style="margin:0 0 20px;color:rgba(162,137,89,0.7);font-size:15px;line-height:1.6">
              We are pleased to invite you to a <strong style="color:#a28959">mock interview session</strong> as part of your student visa application process with HARROWGATE Consultancy.
            </p>
            <div style="background:rgba(162,137,89,0.07);border:1px solid rgba(162,137,89,0.2);border-radius:10px;padding:20px 24px;margin:20px 0">
              <table style="width:100%;border-collapse:collapse">
                <tr>
                  <td style="padding:8px 0;color:rgba(162,137,89,0.5);font-size:13px;width:40%;border-bottom:1px solid rgba(162,137,89,0.08)">Date &amp; Time</td>
                  <td style="padding:8px 0;color:#a28959;font-size:13px;font-weight:600;border-bottom:1px solid rgba(162,137,89,0.08)">${opts.dateTime}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:rgba(162,137,89,0.5);font-size:13px;width:40%">Platform</td>
                  <td style="padding:8px 0;color:#a28959;font-size:13px;font-weight:600">Zoom</td>
                </tr>
              </table>
            </div>
            ${opts.notes ? `<div style="background:rgba(162,137,89,0.05);border:1px solid rgba(162,137,89,0.15);border-radius:10px;padding:16px 20px;margin:16px 0;font-size:14px;color:rgba(162,137,89,0.65);line-height:1.6"><strong>Additional notes:</strong><br>${opts.notes}</div>` : ""}
            <div style="margin-top:28px;text-align:center">
              <a href="${opts.zoomLink}" style="display:inline-block;background:#a28959;color:#0f2d18;padding:14px 32px;border-radius:999px;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:0.5px">
                🎥 Join Zoom Meeting →
              </a>
            </div>
            <p style="margin:20px 0 0;color:rgba(162,137,89,0.45);font-size:12px;text-align:center">
              Please be punctual and ensure your camera and microphone are working before the session.
            </p>
          </div>
          <div style="padding:16px 32px;text-align:center;border-top:1px solid rgba(162,137,89,0.1)">
            <p style="margin:0;color:rgba(162,137,89,0.3);font-size:11px">HARROWGATE Consultancy · Hong Kong</p>
          </div>
        </div>
      `,
    });
    console.log(`[email] Interview invite sent to ${opts.studentEmail}`);
  } catch (err) { console.error("[email] Failed to send interview invite:", err); }
}

// ── Notify student: university interview invite ──────────────────────────────
export async function sendUniversityInterviewInviteEmail(opts: {
  name: string; studentEmail: string; link: string;
  platform: "zoom" | "teams"; dateTime: string; refCode: string; notes?: string;
}) {
  if (!opts.studentEmail) return;
  const transport = createTransport();
  if (!transport) return;
  const isTeams = opts.platform === "teams";
  const platformLabel = isTeams ? "Microsoft Teams" : "Zoom";
  const platformEmoji = isTeams ? "💼" : "🎥";
  const platformColor = isTeams ? "#6264a7" : "#2d8cff";
  try {
    await transport.sendMail({
      from: `"HARROWGATE Consultancy" <${process.env.GMAIL_USER}>`,
      to: opts.studentEmail,
      replyTo: process.env.GMAIL_USER,
      headers: { "X-Priority": "1", "X-MSMail-Priority": "High", "Importance": "high" },
      subject: `University Interview Invitation — HARROWGATE Consultancy`,
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#0f2d18;border-radius:12px;overflow:hidden">
          <div style="background:#0a2010;padding:24px 32px;text-align:center;border-bottom:1px solid rgba(162,137,89,0.2)">
            <h1 style="margin:0;color:#a28959;font-size:20px;letter-spacing:2px">HARROWGATE</h1>
            <p style="margin:4px 0 0;color:rgba(162,137,89,0.5);font-size:11px;letter-spacing:3px;text-transform:uppercase">Consultancy</p>
          </div>
          <div style="padding:32px">
            <h2 style="margin:0 0 4px;color:#a28959;font-size:22px">${platformEmoji} University Interview Invitation</h2>
            <p style="margin:0 0 24px;color:rgba(162,137,89,0.55);font-size:13px">Reference: ${opts.refCode}</p>
            <p style="margin:0 0 20px;color:rgba(162,137,89,0.7);font-size:15px;line-height:1.6">Dear ${opts.name},</p>
            <p style="margin:0 0 20px;color:rgba(162,137,89,0.7);font-size:15px;line-height:1.6">
              We are pleased to inform you that your <strong style="color:#a28959">university interview</strong> has been arranged. Please join the meeting on time.
            </p>
            <div style="background:rgba(162,137,89,0.07);border:1px solid rgba(162,137,89,0.2);border-radius:10px;padding:20px 24px;margin:20px 0">
              <table style="width:100%;border-collapse:collapse">
                <tr>
                  <td style="padding:8px 0;color:rgba(162,137,89,0.5);font-size:13px;width:40%;border-bottom:1px solid rgba(162,137,89,0.08)">Date &amp; Time</td>
                  <td style="padding:8px 0;color:#a28959;font-size:13px;font-weight:600;border-bottom:1px solid rgba(162,137,89,0.08)">${opts.dateTime}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:rgba(162,137,89,0.5);font-size:13px;width:40%">Platform</td>
                  <td style="padding:8px 0;color:#a28959;font-size:13px;font-weight:600">${platformLabel}</td>
                </tr>
              </table>
            </div>
            ${opts.notes ? `<div style="background:rgba(162,137,89,0.05);border:1px solid rgba(162,137,89,0.15);border-radius:10px;padding:16px 20px;margin:16px 0;font-size:14px;color:rgba(162,137,89,0.65);line-height:1.6"><strong>Additional notes:</strong><br>${opts.notes}</div>` : ""}
            <div style="margin-top:28px;text-align:center">
              <a href="${opts.link}" style="display:inline-block;background:${platformColor};color:#ffffff;padding:14px 32px;border-radius:999px;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:0.5px">
                ${platformEmoji} Join ${platformLabel} →
              </a>
            </div>
            <p style="margin:20px 0 0;color:rgba(162,137,89,0.45);font-size:12px;text-align:center">
              Please be punctual and ensure your camera and microphone are working before the session.
            </p>
          </div>
          <div style="padding:16px 32px;text-align:center;border-top:1px solid rgba(162,137,89,0.1)">
            <p style="margin:0;color:rgba(162,137,89,0.3);font-size:11px">HARROWGATE Consultancy · Hong Kong</p>
          </div>
        </div>
      `,
    });
    console.log(`[email] University interview invite sent to ${opts.studentEmail}`);
  } catch (err) { console.error("[email] Failed to send university interview invite:", err); }
}

// ── Notify student: additional documents requested ───────────────────────────
export async function sendAdditionalDocsRequestEmail(opts: {
  name: string; studentEmail: string; note?: string; portalUrl?: string;
}) {
  if (!opts.studentEmail) return;
  const transport = createTransport();
  if (!transport) return;
  try {
    await transport.sendMail({
      from: `"HARROWGATE Consultancy" <${process.env.GMAIL_USER}>`,
      to: opts.studentEmail,
      subject: `Additional Documents Required — HARROWGATE Consultancy`,
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#0f2d18;border-radius:12px;overflow:hidden">
          <div style="background:#0a2010;padding:24px 32px;text-align:center;border-bottom:1px solid rgba(162,137,89,0.2)">
            <h1 style="margin:0;color:#a28959;font-size:20px;letter-spacing:2px">HARROWGATE</h1>
            <p style="margin:4px 0 0;color:rgba(162,137,89,0.5);font-size:11px;letter-spacing:3px;text-transform:uppercase">Consultancy</p>
          </div>
          <div style="padding:32px">
            <h2 style="margin:0 0 8px;color:#fb923c;font-size:20px">📎 Additional Documents Requested</h2>
            <p style="margin:0 0 20px;color:rgba(162,137,89,0.7);font-size:15px;line-height:1.6">Dear ${opts.name},</p>
            <p style="margin:0 0 20px;color:rgba(162,137,89,0.7);font-size:15px;line-height:1.6">
              Our consultants require additional documents from you in order to continue processing your application.
            </p>
            ${opts.note ? `
            <div style="background:rgba(251,146,60,0.06);border:1px solid rgba(251,146,60,0.2);border-radius:10px;padding:16px 20px;margin:16px 0;font-size:14px;color:rgba(251,146,60,0.8);line-height:1.6">
              <strong>Note from consultant:</strong><br>${opts.note}
            </div>` : ""}
            <p style="margin:16px 0;color:rgba(162,137,89,0.7);font-size:14px;line-height:1.6">
              Please log in to your portal, upload the required document(s), and click <strong style="color:#a28959">"Confirm & Submit"</strong>.
            </p>
            ${opts.portalUrl ? `
            <div style="margin-top:24px;text-align:center">
              <a href="${opts.portalUrl}" style="display:inline-block;background:#a28959;color:#0f2d18;padding:12px 28px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:700">
                Upload Documents →
              </a>
            </div>` : ""}
          </div>
          <div style="padding:16px 32px;text-align:center;border-top:1px solid rgba(162,137,89,0.1)">
            <p style="margin:0;color:rgba(162,137,89,0.3);font-size:11px">HARROWGATE Consultancy · Hong Kong</p>
          </div>
        </div>
      `,
    });
    console.log(`[email] Additional docs request email sent to ${opts.studentEmail}`);
  } catch (err) { console.error("[email] Failed:", err); }
}

// ── Notify admin: student submitted additional documents ─────────────────────
export async function sendAdditionalDocsSubmittedEmail(opts: {
  name: string; email: string | null; passportNumber: string;
  note?: string; fileName: string; submissionId: number;
}) {
  const transport = createTransport();
  if (!transport) return;
  try {
    await transport.sendMail({
      from: `"HARROWGATE Portal" <${process.env.GMAIL_USER}>`,
      to: NOTIFY_TO,
      subject: `Additional Documents Submitted — ${opts.name}`,
      html: adminHtml(
        "📎 Additional Documents Submitted",
        `A student has uploaded the requested additional document(s).`,
        [
          ["Full Name", opts.name],
          ["Email", opts.email || "—"],
          ["Passport Number", opts.passportNumber],
          ["File Uploaded", opts.fileName],
          ...(opts.note ? [["Student Note", opts.note] as [string, string]] : []),
        ],
        "Review in Admin Panel →"
      ),
    });
    console.log(`[email] Additional docs submitted notification sent for ${opts.name}`);
  } catch (err) { console.error("[email] Failed:", err); }
}

// ── Notify student: offer letter ready — make final payment ──────────────────
export async function sendOfferLetterAvailableEmail(opts: {
  name: string; studentEmail: string; portalUrl?: string;
}) {
  if (!opts.studentEmail) return;
  const transport = createTransport();
  if (!transport) return;
  try {
    await transport.sendMail({
      from: `"HARROWGATE Consultancy" <${process.env.GMAIL_USER}>`,
      to: opts.studentEmail,
      replyTo: process.env.GMAIL_USER,
      headers: { "X-Priority": "1", "X-MSMail-Priority": "High", "Importance": "high" },
      subject: `Your Offer Letter is Ready — HARROWGATE Consultancy`,
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#0f2d18;border-radius:12px;overflow:hidden">
          <div style="background:#0a2010;padding:24px 32px;text-align:center;border-bottom:1px solid rgba(162,137,89,0.2)">
            <h1 style="margin:0;color:#a28959;font-size:20px;letter-spacing:2px">HARROWGATE</h1>
            <p style="margin:4px 0 0;color:rgba(162,137,89,0.5);font-size:11px;letter-spacing:3px;text-transform:uppercase">Consultancy</p>
          </div>
          <div style="padding:32px">
            <h2 style="margin:0 0 8px;color:#a28959;font-size:22px">🎉 Your Offer Letter is Ready!</h2>
            <p style="margin:0 0 20px;color:rgba(162,137,89,0.7);font-size:15px;line-height:1.6">Dear ${opts.name},</p>
            <p style="margin:0 0 20px;color:rgba(162,137,89,0.7);font-size:15px;line-height:1.6">
              We are pleased to inform you that your <strong style="color:#a28959">official university offer letter</strong> is now available.
            </p>
            <div style="background:rgba(251,146,60,0.06);border:1px solid rgba(251,146,60,0.2);border-radius:10px;padding:16px 20px;margin:16px 0;font-size:14px;color:rgba(251,146,60,0.8);line-height:1.6">
              To collect your offer letter, please log in to your portal and complete the <strong>final payment</strong>. Once confirmed by our team, you will be able to download it instantly.
            </div>
            ${opts.portalUrl ? `
            <div style="margin-top:24px;text-align:center">
              <a href="${opts.portalUrl}" style="display:inline-block;background:#a28959;color:#0f2d18;padding:12px 28px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:700">
                Complete Final Payment →
              </a>
            </div>` : ""}
          </div>
          <div style="padding:16px 32px;text-align:center;border-top:1px solid rgba(162,137,89,0.1)">
            <p style="margin:0;color:rgba(162,137,89,0.3);font-size:11px">HARROWGATE Consultancy · Hong Kong</p>
          </div>
        </div>
      `,
    });
    console.log(`[email] Offer letter available email sent to ${opts.studentEmail}`);
  } catch (err) { console.error("[email] Failed:", err); }
}

// ── Notify admin: final payment receipt uploaded ─────────────────────────────
export async function sendFinalReceiptEmail(opts: {
  name: string; email: string | null; passportNumber: string;
  receiptFileName: string; submissionId: number;
}) {
  const transport = createTransport();
  if (!transport) return;
  try {
    await transport.sendMail({
      from: `"HARROWGATE Portal" <${process.env.GMAIL_USER}>`,
      to: NOTIFY_TO,
      subject: `Final Payment Receipt — ${opts.name}`,
      html: adminHtml("💳 Final Payment Receipt Received", `A student has uploaded their final payment receipt and is awaiting confirmation.`, [
        ["Full Name", opts.name], ["Email", opts.email || "—"],
        ["Passport Number", opts.passportNumber], ["Receipt File", opts.receiptFileName],
      ], "Confirm Final Payment →"),
    });
    console.log(`[email] Final receipt upload notification sent for ${opts.name}`);
  } catch (err) { console.error("[email] Failed:", err); }
}

// ── Notify student: final payment confirmed — offer letter attached ───────────
export async function sendOfferLetterConfirmedEmail(opts: {
  name: string; studentEmail: string;
  attachment: { content: Buffer; filename: string; contentType: string };
  portalUrl?: string;
}) {
  if (!opts.studentEmail) return;
  const transport = createTransport();
  if (!transport) return;
  try {
    await transport.sendMail({
      from: `"HARROWGATE Consultancy" <${process.env.GMAIL_USER}>`,
      to: opts.studentEmail,
      replyTo: process.env.GMAIL_USER,
      subject: `🎉 Your Offer Letter — HARROWGATE Consultancy`,
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#0f2d18;border-radius:12px;overflow:hidden">
          <div style="background:#0a2010;padding:24px 32px;text-align:center;border-bottom:1px solid rgba(162,137,89,0.2)">
            <h1 style="margin:0;color:#a28959;font-size:20px;letter-spacing:2px">HARROWGATE</h1>
            <p style="margin:4px 0 0;color:rgba(162,137,89,0.5);font-size:11px;letter-spacing:3px;text-transform:uppercase">Consultancy</p>
          </div>
          <div style="padding:32px">
            <h2 style="margin:0 0 8px;color:#a28959;font-size:22px">🎉 Congratulations, ${opts.name}!</h2>
            <p style="margin:0 0 20px;color:rgba(162,137,89,0.7);font-size:15px;line-height:1.6">
              Your final payment has been confirmed. We are delighted to provide you with your <strong style="color:#a28959">official university offer letter</strong>, attached to this email.
            </p>
            <div style="background:rgba(74,222,128,0.06);border:1px solid rgba(74,222,128,0.2);border-radius:10px;padding:16px 20px;margin:16px 0;font-size:14px;color:rgba(74,222,128,0.8);line-height:1.6">
              📎 Your offer letter is attached as <strong>${opts.attachment.filename}</strong>.<br>
              You can also view and download it at any time from your student portal.
            </div>
            <p style="margin:16px 0;color:rgba(162,137,89,0.65);font-size:14px;line-height:1.6">
              If you have any questions, please do not hesitate to contact us. We wish you every success in your studies.
            </p>
            ${opts.portalUrl ? `
            <div style="margin-top:24px;text-align:center">
              <a href="${opts.portalUrl}" style="display:inline-block;background:#a28959;color:#0f2d18;padding:12px 28px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:700">
                Open Student Portal →
              </a>
            </div>` : ""}
          </div>
          <div style="padding:16px 32px;text-align:center;border-top:1px solid rgba(162,137,89,0.1)">
            <p style="margin:0;color:rgba(162,137,89,0.3);font-size:11px">HARROWGATE Consultancy · Hong Kong</p>
          </div>
        </div>
      `,
      attachments: [{
        filename: opts.attachment.filename,
        content: opts.attachment.content,
        contentType: opts.attachment.contentType,
      }],
    });
    console.log(`[email] Offer letter confirmation email (with attachment) sent to ${opts.studentEmail}`);
  } catch (err) { console.error("[email] Failed to send offer letter email:", err); }
}

// ── Admin → student: custom message ─────────────────────────────────────────
export async function sendCustomMessageToStudentEmail(opts: {
  name: string; studentEmail: string; subject: string; body: string; portalUrl?: string;
}) {
  if (!opts.studentEmail) return;
  const transport = createTransport();
  if (!transport) { console.warn("[email] credentials not set — skipping"); return; }
  try {
    await transport.sendMail({
      from: `"HARROWGATE Consultancy" <${process.env.GMAIL_USER}>`,
      to: opts.studentEmail,
      replyTo: process.env.GMAIL_USER,
      subject: `${opts.subject} — HARROWGATE Consultancy`,
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#0f2d18;border-radius:12px;overflow:hidden">
          <div style="background:#0a2010;padding:24px 32px;text-align:center;border-bottom:1px solid rgba(162,137,89,0.2)">
            <h1 style="margin:0;color:#a28959;font-size:20px;letter-spacing:2px">HARROWGATE</h1>
            <p style="margin:4px 0 0;color:rgba(162,137,89,0.5);font-size:11px;letter-spacing:3px;text-transform:uppercase">Consultancy</p>
          </div>
          <div style="padding:32px">
            <h2 style="margin:0 0 16px;color:#a28959;font-size:20px">✉️ Message from Your Consultant</h2>
            <p style="margin:0 0 16px;color:rgba(162,137,89,0.7);font-size:15px;line-height:1.6">Dear ${opts.name},</p>
            <div style="background:rgba(162,137,89,0.07);border:1px solid rgba(162,137,89,0.2);border-radius:10px;padding:20px 24px;margin:16px 0;font-size:14px;color:rgba(162,137,89,0.85);line-height:1.7;white-space:pre-wrap;">${opts.body}</div>
            <p style="margin:20px 0 0;color:rgba(162,137,89,0.55);font-size:13px;line-height:1.6">
              You can reply to this message and upload any requested documents directly in your student portal.
            </p>
            ${opts.portalUrl ? `
            <div style="margin-top:24px;text-align:center">
              <a href="${opts.portalUrl}" style="display:inline-block;background:#a28959;color:#0f2d18;padding:12px 28px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:700">
                Open Portal to Reply →
              </a>
            </div>` : ""}
          </div>
          <div style="padding:16px 32px;text-align:center;border-top:1px solid rgba(162,137,89,0.1)">
            <p style="margin:0;color:rgba(162,137,89,0.3);font-size:11px">HARROWGATE Consultancy · Hong Kong</p>
          </div>
        </div>
      `,
    });
    console.log(`[email] Custom message sent to ${opts.studentEmail}`);
  } catch (err) { console.error("[email] Failed to send custom message:", err); }
}

// ── Notify admin: student replied to a message ───────────────────────────────
export async function sendStudentReplyNotificationEmail(opts: {
  name: string; email: string | null; subject: string; body: string; submissionId: number;
}) {
  const transport = createTransport();
  if (!transport) return;
  try {
    await transport.sendMail({
      from: `"HARROWGATE Portal" <${process.env.GMAIL_USER}>`,
      to: NOTIFY_TO,
      subject: `Student Reply: ${opts.subject} — ${opts.name}`,
      html: adminHtml(
        "📩 Student Reply Received",
        `A student has replied to your message.`,
        [
          ["Full Name", opts.name],
          ["Email", opts.email || "—"],
          ["Subject", opts.subject],
          ["Message", opts.body.substring(0, 200) + (opts.body.length > 200 ? "…" : "")],
        ],
        "View in Admin Panel →"
      ),
    });
    console.log(`[email] Student reply notification sent for ${opts.name}`);
  } catch (err) { console.error("[email] Failed:", err); }
}

// ── Notify student: e-visa ready ───────────────────────────────────────────
export async function sendEVisaReadyEmail(opts: {
  name: string; studentEmail: string; portalUrl: string;
}) {
  if (!opts.studentEmail) { console.warn("[email] No student email — skipping e-visa email"); return; }
  const transport = createTransport();
  if (!transport) { console.warn("[email] credentials not set — skipping"); return; }
  try {
    await transport.sendMail({
      from: `"HARROWGATE Consultancy" <${process.env.GMAIL_USER}>`,
      to: opts.studentEmail,
      subject: `Your Hong Kong Student e-Visa is Ready — HARROWGATE`,
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#0f2d18;border-radius:12px;overflow:hidden">
          <div style="background:#0a2010;padding:24px 32px;text-align:center;border-bottom:1px solid rgba(162,137,89,0.2)">
            <h1 style="margin:0;color:#a28959;font-size:20px;letter-spacing:2px">HARROWGATE</h1>
            <p style="margin:4px 0 0;color:rgba(162,137,89,0.5);font-size:11px;letter-spacing:3px;text-transform:uppercase">Consultancy</p>
          </div>
          <div style="padding:32px">
            <h2 style="margin:0 0 8px;color:#4ade80;font-size:22px">🎉 Your e-Visa is Ready!</h2>
            <p style="margin:0 0 20px;color:rgba(162,137,89,0.7);font-size:15px;line-height:1.6">Dear ${opts.name},</p>
            <p style="margin:0 0 20px;color:rgba(162,137,89,0.7);font-size:15px;line-height:1.6">
              We are delighted to inform you that the <strong style="color:#4ade80">Hong Kong Immigration Department</strong> has officially issued your student e-Visa.
            </p>
            <p style="margin:0 0 20px;color:rgba(162,137,89,0.7);font-size:15px;line-height:1.6">
              Your e-Visa is now available to <strong style="color:#a28959">view and download</strong> directly from your HARROWGATE portal. Please log in and navigate to your portal to access it.
            </p>
            <div style="background:rgba(74,222,128,0.06);border:1px solid rgba(74,222,128,0.18);border-radius:10px;padding:16px 20px;margin:24px 0;font-size:14px;color:rgba(162,137,89,0.65);line-height:1.6">
              Congratulations on successfully completing your Hong Kong student visa journey! We wish you all the best in your studies.
            </div>
            <div style="margin-top:24px;text-align:center">
              <a href="${opts.portalUrl}" style="display:inline-block;background:#4ade80;color:#0f2d18;padding:12px 28px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.5px">
                Download Your e-Visa →
              </a>
            </div>
          </div>
          <div style="padding:16px 32px;text-align:center;border-top:1px solid rgba(162,137,89,0.1)">
            <p style="margin:0;color:rgba(162,137,89,0.3);font-size:11px">HARROWGATE Consultancy · Hong Kong</p>
          </div>
        </div>
      `,
    });
    console.log(`[email] e-Visa ready email sent to ${opts.studentEmail}`);
  } catch (err) { console.error("[email] Failed to send e-visa email:", err); }
}

// ── Notify admin: student composed email awaiting approval ────────────────────
export async function sendOutboxPendingNotification(opts: {
  name: string; studentEmail: string | null; submissionId: number;
  to: string; subject: string; body: string;
}) {
  const transport = createTransport();
  if (!transport) return;
  try {
    await transport.sendMail({
      from: `"HARROWGATE Portal" <${process.env.GMAIL_USER}>`,
      to: NOTIFY_TO,
      subject: `✉️ Student Email Awaiting Approval — ${opts.name}`,
      html: adminHtml(
        "✉️ Student Composed an Email",
        `A student has written an email that is pending your approval before it is sent.`,
        [
          ["Student", opts.name],
          ["Contact", opts.studentEmail || "—"],
          ["To (Recipient)", opts.to],
          ["Subject", opts.subject],
          ["Preview", opts.body.substring(0, 300) + (opts.body.length > 300 ? "…" : "")],
        ],
        "Review & Approve in Admin Panel →"
      ),
    });
  } catch (err) { console.error("[email] Failed to send outbox notification:", err); }
}

// ── Send approved outbox email via shared Gmail account ───────────────────────
export async function sendApprovedOutboxEmail(opts: {
  fromEmail: string; fromPassword: string;
  to: string; subject: string; body: string; studentName: string;
}) {
  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: { user: opts.fromEmail, pass: opts.fromPassword },
  });
  await transport.sendMail({
    from: `"${opts.studentName}" <${opts.fromEmail}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.body,
    html: `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#333;white-space:pre-wrap">${opts.body.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>`,
  });
}

// ── Shared admin email template ──────────────────────────────────────────────
function adminHtml(heading: string, intro: string, rows: [string, string][], cta: string) {
  return `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#0f2d18;border-radius:12px;overflow:hidden">
      <div style="background:#0a2010;padding:24px 32px;text-align:center;border-bottom:1px solid rgba(162,137,89,0.2)">
        <h1 style="margin:0;color:#a28959;font-size:20px;letter-spacing:2px">HARROWGATE</h1>
        <p style="margin:4px 0 0;color:rgba(162,137,89,0.5);font-size:11px;letter-spacing:3px;text-transform:uppercase">Consultancy</p>
      </div>
      <div style="padding:32px">
        <h2 style="margin:0 0 8px;color:#a28959;font-size:18px">${heading}</h2>
        <p style="margin:0 0 24px;color:rgba(162,137,89,0.6);font-size:14px">${intro}</p>
        <table style="width:100%;border-collapse:collapse">
          ${rows.map(([l, v]) => `<tr>
            <td style="padding:10px 0;color:rgba(162,137,89,0.5);font-size:13px;border-bottom:1px solid rgba(162,137,89,0.08);width:40%">${l}</td>
            <td style="padding:10px 0;color:#a28959;font-size:13px;font-weight:600;border-bottom:1px solid rgba(162,137,89,0.08)">${v}</td>
          </tr>`).join("")}
        </table>
        <div style="margin-top:28px;text-align:center">
          <a href="https://${process.env.REPLIT_DEV_DOMAIN || "localhost"}/admin/submissions"
            style="display:inline-block;background:#a28959;color:#0f2d18;padding:12px 28px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.5px">
            ${cta}
          </a>
        </div>
      </div>
      <div style="padding:16px 32px;text-align:center;border-top:1px solid rgba(162,137,89,0.1)">
        <p style="margin:0;color:rgba(162,137,89,0.3);font-size:11px">HARROWGATE Consultancy · Hong Kong</p>
      </div>
    </div>
  `;
}

// ── Send arbitrary email to an agent ───────────────────────────────────────
export async function sendAgentEmail(opts: {
  to: string;
  subject: string;
  body: string;
}) {
  const transport = createTransport();
  if (!transport) throw new Error("Email credentials not configured");
  await transport.sendMail({
    from: `"HARROWGATE Consultancy" <${process.env.GMAIL_USER}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.body,
    html: `
      <div style="font-family:Georgia,serif;background:#071a10;padding:0;margin:0">
        <div style="max-width:560px;margin:0 auto;background:#0c2217;border:1px solid rgba(162,137,89,0.2);border-radius:12px;overflow:hidden">
          <div style="padding:24px 32px;border-bottom:1px solid rgba(162,137,89,0.15)">
            <p style="margin:0;color:#a28959;font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase">HARROWGATE Consultancy</p>
          </div>
          <div style="padding:28px 32px">
            <div style="color:#c9b99a;font-size:15px;line-height:1.7;white-space:pre-wrap">${opts.body.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
          </div>
          <div style="padding:16px 32px;text-align:center;border-top:1px solid rgba(162,137,89,0.1)">
            <p style="margin:0;color:rgba(162,137,89,0.3);font-size:11px">HARROWGATE Consultancy · Hong Kong</p>
          </div>
        </div>
      </div>
    `,
  });
}

// ── Send invoice to student ──────────────────────────────────────────────────
export async function sendInvoiceToStudentEmail(opts: {
  studentEmail: string;
  studentName: string;
  invoiceNo: string;
  date: string;
  degreeType: string;
  items: Array<{ no: number; description: string; qty: number; amount: number }>;
  schedule: Array<{ no: number; label: string; amount: number }>;
  remarks: string[];
  total: number;
  highlightedPayment?: number | null;
}) {
  const transport = createTransport();
  if (!transport) throw new Error("Email credentials not configured (GMAIL_USER / GMAIL_APP_PASSWORD missing).");
  const itemRows = opts.items.map(it => {
    const due = opts.highlightedPayment === it.no;
    return `
    <tr style="${due ? "background:#fff0f0;" : ""}">
      <td style="border:1px solid ${due ? "#dc2626" : "#ccc"};padding:8px 10px;text-align:center;font-size:12px;${due ? "color:#dc2626;font-weight:800;" : ""}">${it.no}</td>
      <td style="border:1px solid ${due ? "#dc2626" : "#ccc"};padding:8px 10px;font-size:12px;line-height:1.5">${it.description}${due ? ' <span style="display:inline-block;margin-left:8px;background:#dc2626;color:#fff;font-size:9px;font-weight:800;padding:1px 6px;border-radius:3px;vertical-align:middle">AMOUNT DUE</span>' : ""}</td>
      <td style="border:1px solid ${due ? "#dc2626" : "#ccc"};padding:8px 10px;text-align:center;font-size:12px">${it.qty}</td>
      <td style="border:1px solid ${due ? "#dc2626" : "#ccc"};padding:8px 10px;text-align:right;font-size:${due ? "14px" : "12px"};font-weight:${due ? "900" : "600"};${due ? "color:#dc2626;" : ""}">HKD$ ${it.amount.toLocaleString("en-HK")}</td>
    </tr>`;
  }).join("");
  const scheduleRows = opts.schedule.map(r => {
    const due = opts.highlightedPayment === r.no;
    return `
    <tr style="${due ? "background:#fff0f0;" : ""}">
      <td style="padding:5px 8px;font-size:11px;${due ? "color:#dc2626;font-weight:800;" : "color:#555;"}">${r.no}.</td>
      <td style="padding:5px 8px;font-size:11px;${due ? "color:#dc2626;font-weight:800;" : ""}">${r.label}${due ? ' <span style="font-size:9px;color:#dc2626;font-weight:800">← DUE NOW</span>' : ""}</td>
      <td style="padding:5px 8px;font-size:${due ? "13px" : "11px"};font-weight:${due ? "900" : "600"};text-align:right;${due ? "color:#dc2626;" : ""}">HKD$ ${r.amount.toLocaleString("en-HK")}</td>
    </tr>`;
  }).join("");
  const remarkRows = opts.remarks.map((r, i) => `<p style="margin:4px 0;font-size:11px;line-height:1.6;color:#333"><strong>${i+1})</strong> ${r}</p>`).join("");

  await transport.sendMail({
    from: `"HARROWGATE Consultancy" <${process.env.GMAIL_USER}>`,
    to: opts.studentEmail,
    subject: `Invoice ${opts.invoiceNo} — HARROWGATE Consultancy`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;background:#fff;border:1px solid #ddd;border-radius:8px;overflow:hidden">
        <div style="background:#0b2213;padding:20px 32px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <p style="margin:0;color:#f0d28c;font-size:22px;font-weight:900;letter-spacing:2px">INVOICE</p>
            <p style="margin:4px 0 0;color:rgba(162,137,89,0.6);font-size:11px;letter-spacing:2px">HARROWGATE CONSULTANCY</p>
          </div>
          <div style="text-align:right;color:rgba(162,137,89,0.7);font-size:11px;line-height:1.8">
            <p style="margin:0">P: +852 6159 0422</p>
            <p style="margin:0">harrowgateconsultancy@gmail.com</p>
          </div>
        </div>
        <div style="padding:24px 32px">
          <div style="display:flex;justify-content:space-between;margin-bottom:20px">
            <div style="font-size:12px;line-height:2"><strong>Bill to:</strong> ${opts.studentName}<br><strong>Degree:</strong> ${opts.degreeType}</div>
            <div style="text-align:right;font-size:12px;line-height:2"><strong>Invoice No:</strong> ${opts.invoiceNo}<br><strong>Date:</strong> ${opts.date}</div>
          </div>
          <table style="width:100%;border-collapse:collapse;margin-bottom:0">
            <thead>
              <tr style="background:#0b2213;color:#f0d28c">
                <th style="border:1px solid #555;padding:8px 10px;text-align:center;font-size:11px;width:36px">NO</th>
                <th style="border:1px solid #555;padding:8px 10px;text-align:left;font-size:11px">Description</th>
                <th style="border:1px solid #555;padding:8px 10px;text-align:center;font-size:11px;width:44px">QTY</th>
                <th style="border:1px solid #555;padding:8px 10px;text-align:right;font-size:11px;width:130px">AMOUNT HKD$</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
              <tr style="background:#f5f5f5">
                <td colspan="3" style="border:1px solid #ccc;padding:8px 10px;text-align:right;font-weight:800;font-size:12px">TOTAL</td>
                <td style="border:1px solid #ccc;padding:8px 10px;text-align:right;font-weight:900;font-size:13px">HKD$ ${opts.total.toLocaleString("en-HK")}</td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top:20px">
            <p style="font-weight:800;font-size:12px;border-bottom:1.5px solid #0b2213;padding-bottom:4px;margin-bottom:8px">Payment Schedule:</p>
            <table style="width:100%"><tbody>${scheduleRows}</tbody></table>
          </div>
          <div style="margin-top:20px">
            <p style="font-weight:800;font-size:12px;border-bottom:1.5px solid #0b2213;padding-bottom:4px;margin-bottom:8px">Remarks:</p>
            ${remarkRows}
          </div>
        </div>
        <div style="padding:14px 32px;background:#f9f9f9;border-top:1px solid #eee;text-align:center">
          <p style="margin:0;font-size:11px;color:#888">HARROWGATE Consultancy · Hong Kong · harrowgateconsultancy@gmail.com</p>
        </div>
      </div>`,
  });
}

// ── Send receipt to student ──────────────────────────────────────────────────
export async function sendReceiptToStudentEmail(opts: {
  studentEmail: string;
  studentName: string;
  receiptNo: string;
  date: string;
  amountPaid: number;
  paymentMethod: string;
  reference: string;
  notes: string;
  degreeType: string;
}) {
  const transport = createTransport();
  if (!transport) throw new Error("Email credentials not configured (GMAIL_USER / GMAIL_APP_PASSWORD missing).");
  await transport.sendMail({
    from: `"HARROWGATE Consultancy" <${process.env.GMAIL_USER}>`,
    to: opts.studentEmail,
    subject: `Payment Receipt ${opts.receiptNo} — HARROWGATE Consultancy`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border:1px solid #ddd;border-radius:8px;overflow:hidden">
        <div style="background:#0b2213;padding:20px 32px;text-align:center">
          <p style="margin:0;color:#f0d28c;font-size:20px;font-weight:900;letter-spacing:2px">OFFICIAL RECEIPT</p>
          <p style="margin:4px 0 0;color:rgba(162,137,89,0.5);font-size:11px;letter-spacing:2px">HARROWGATE CONSULTANCY</p>
        </div>
        <div style="padding:28px 32px">
          <div style="display:flex;justify-content:space-between;margin-bottom:24px;font-size:12px;line-height:2">
            <div><strong>Received from:</strong> ${opts.studentName}<br><strong>Degree:</strong> ${opts.degreeType}</div>
            <div style="text-align:right"><strong>Receipt No:</strong> ${opts.receiptNo}<br><strong>Date:</strong> ${opts.date}</div>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <tbody>
              <tr style="background:#f9f9f9"><td style="border:1px solid #ccc;padding:10px 14px;color:#666;width:40%">Amount Paid</td><td style="border:1px solid #ccc;padding:10px 14px;font-weight:700;font-size:16px;color:#0b2213">HKD$ ${opts.amountPaid.toLocaleString("en-HK")}</td></tr>
              <tr><td style="border:1px solid #ccc;padding:10px 14px;color:#666">Payment Method</td><td style="border:1px solid #ccc;padding:10px 14px;font-weight:600">${opts.paymentMethod}</td></tr>
              ${opts.reference ? `<tr style="background:#f9f9f9"><td style="border:1px solid #ccc;padding:10px 14px;color:#666">Reference / TXN ID</td><td style="border:1px solid #ccc;padding:10px 14px;font-weight:600">${opts.reference}</td></tr>` : ""}
              ${opts.notes ? `<tr><td style="border:1px solid #ccc;padding:10px 14px;color:#666">Notes</td><td style="border:1px solid #ccc;padding:10px 14px">${opts.notes}</td></tr>` : ""}
            </tbody>
          </table>
          <div style="margin-top:24px;padding:14px 16px;background:#f0fff4;border:1px solid #a7f3d0;border-radius:8px;font-size:12px;color:#065f46">
            ✅ This receipt confirms that your payment of <strong>HKD$ ${opts.amountPaid.toLocaleString("en-HK")}</strong> has been received by HARROWGATE Consultancy. Please keep this for your records.
          </div>
        </div>
        <div style="padding:14px 32px;background:#f9f9f9;border-top:1px solid #eee;text-align:center">
          <p style="margin:0;font-size:11px;color:#888">HARROWGATE Consultancy · Hong Kong · harrowgateconsultancy@gmail.com</p>
        </div>
      </div>`,
  });
}
