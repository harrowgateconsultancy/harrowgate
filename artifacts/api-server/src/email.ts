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
