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

export async function sendNewApplicationEmail(opts: {
  name: string;
  email: string | null;
  passportNumber: string;
  dateOfBirth: string;
  docCount: number;
}) {
  const transport = createTransport();
  if (!transport) {
    console.warn("[email] GMAIL_USER or GMAIL_APP_PASSWORD not set — skipping notification");
    return;
  }
  try {
    await transport.sendMail({
      from: `"HARROWGATE Portal" <${process.env.GMAIL_USER}>`,
      to: NOTIFY_TO,
      subject: `New Student Application — ${opts.name}`,
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#0f2d18;border-radius:12px;overflow:hidden">
          <div style="background:#0a2010;padding:24px 32px;text-align:center;border-bottom:1px solid rgba(162,137,89,0.2)">
            <h1 style="margin:0;color:#a28959;font-size:20px;letter-spacing:2px">HARROWGATE</h1>
            <p style="margin:4px 0 0;color:rgba(162,137,89,0.5);font-size:11px;letter-spacing:3px;text-transform:uppercase">Consultancy</p>
          </div>
          <div style="padding:32px">
            <h2 style="margin:0 0 8px;color:#a28959;font-size:18px">New Application Submitted</h2>
            <p style="margin:0 0 24px;color:rgba(162,137,89,0.6);font-size:14px">A student has submitted a new visa application.</p>
            <table style="width:100%;border-collapse:collapse">
              ${row("Full Name", opts.name)}
              ${row("Email", opts.email || "—")}
              ${row("Passport Number", opts.passportNumber)}
              ${row("Date of Birth", opts.dateOfBirth)}
              ${row("Documents Uploaded", String(opts.docCount))}
            </table>
            <div style="margin-top:28px;text-align:center">
              <a href="https://${process.env.REPLIT_DEV_DOMAIN || "localhost"}/admin/submissions"
                style="display:inline-block;background:#a28959;color:#0f2d18;padding:12px 28px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.5px">
                Review in Admin Panel →
              </a>
            </div>
          </div>
          <div style="padding:16px 32px;text-align:center;border-top:1px solid rgba(162,137,89,0.1)">
            <p style="margin:0;color:rgba(162,137,89,0.3);font-size:11px">HARROWGATE Consultancy · Hong Kong</p>
          </div>
        </div>
      `,
    });
    console.log(`[email] New application notification sent for ${opts.name}`);
  } catch (err) {
    console.error("[email] Failed to send new application notification:", err);
  }
}

export async function sendReceiptUploadEmail(opts: {
  name: string;
  email: string | null;
  passportNumber: string;
  receiptFileName: string;
  submissionId: number;
}) {
  const transport = createTransport();
  if (!transport) {
    console.warn("[email] GMAIL_USER or GMAIL_APP_PASSWORD not set — skipping notification");
    return;
  }
  try {
    await transport.sendMail({
      from: `"HARROWGATE Portal" <${process.env.GMAIL_USER}>`,
      to: NOTIFY_TO,
      subject: `Payment Receipt Uploaded — ${opts.name}`,
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#0f2d18;border-radius:12px;overflow:hidden">
          <div style="background:#0a2010;padding:24px 32px;text-align:center;border-bottom:1px solid rgba(162,137,89,0.2)">
            <h1 style="margin:0;color:#a28959;font-size:20px;letter-spacing:2px">HARROWGATE</h1>
            <p style="margin:4px 0 0;color:rgba(162,137,89,0.5);font-size:11px;letter-spacing:3px;text-transform:uppercase">Consultancy</p>
          </div>
          <div style="padding:32px">
            <h2 style="margin:0 0 8px;color:#fb923c;font-size:18px">💳 Payment Receipt Received</h2>
            <p style="margin:0 0 24px;color:rgba(162,137,89,0.6);font-size:14px">A student has uploaded their payment receipt and is awaiting confirmation.</p>
            <table style="width:100%;border-collapse:collapse">
              ${row("Full Name", opts.name)}
              ${row("Email", opts.email || "—")}
              ${row("Passport Number", opts.passportNumber)}
              ${row("Receipt File", opts.receiptFileName)}
            </table>
            <div style="margin-top:28px;text-align:center">
              <a href="https://${process.env.REPLIT_DEV_DOMAIN || "localhost"}/admin/submissions"
                style="display:inline-block;background:#a28959;color:#0f2d18;padding:12px 28px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.5px">
                Confirm Payment →
              </a>
            </div>
          </div>
          <div style="padding:16px 32px;text-align:center;border-top:1px solid rgba(162,137,89,0.1)">
            <p style="margin:0;color:rgba(162,137,89,0.3);font-size:11px">HARROWGATE Consultancy · Hong Kong</p>
          </div>
        </div>
      `,
    });
    console.log(`[email] Receipt upload notification sent for ${opts.name}`);
  } catch (err) {
    console.error("[email] Failed to send receipt notification:", err);
  }
}

function row(label: string, value: string) {
  return `
    <tr>
      <td style="padding:10px 0;color:rgba(162,137,89,0.5);font-size:13px;border-bottom:1px solid rgba(162,137,89,0.08);width:40%">${label}</td>
      <td style="padding:10px 0;color:#a28959;font-size:13px;font-weight:600;border-bottom:1px solid rgba(162,137,89,0.08)">${value}</td>
    </tr>
  `;
}
