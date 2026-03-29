import nodemailer from "nodemailer";

const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

/** Create a Gmail SMTP transporter */
function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD, // Google App Password (not your regular Gmail password)
    },
  });
}

const FROM = `"SplitEase" <${process.env.GMAIL_USER}>`;

/** Sent to a brand-new user who was invited and auto-enrolled */
export async function sendWelcomeInviteEmail({
  to,
  name,
  password,
  groupName,
  inviterName,
}: {
  to: string;
  name: string;
  password: string;
  groupName: string;
  inviterName: string;
}) {
  const loginUrl = `${APP_URL}/auth/signin`;
  const transporter = createTransporter();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>You've been invited to SplitEase</title>
</head>
<body style="margin:0;padding:0;background:#f8f5ff;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f5ff;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(79,70,229,0.10);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:36px 40px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:16px;padding:10px 20px;">
                <span style="background:white;border-radius:10px;width:32px;height:32px;display:inline-block;line-height:32px;text-align:center;font-weight:900;color:#4f46e5;font-size:16px;">S</span>
                &nbsp;
                <span style="color:white;font-weight:900;font-size:20px;letter-spacing:-0.5px;vertical-align:middle;">SplitEase</span>
              </div>
              <div style="margin-top:20px;font-size:32px;">🎉</div>
              <h1 style="color:white;font-size:22px;font-weight:800;margin:8px 0 4px;">You've been invited!</h1>
              <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">
                <strong>${inviterName}</strong> added you to <strong>${groupName}</strong>
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="color:#0f172a;font-size:15px;margin:0 0 24px;">Hi <strong>${name}</strong>,</p>
              <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 28px;">
                <strong>${inviterName}</strong> has added you to the group <strong>"${groupName}"</strong> on SplitEase —
                the easiest way to split shared expenses with friends and family.
                We've created an account for you automatically.
              </p>

              <!-- Credentials Box -->
              <div style="background:#f8f5ff;border:1.5px solid #e0e7ff;border-radius:16px;padding:24px;margin-bottom:28px;">
                <p style="font-size:12px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px;">Your Login Credentials</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #e0e7ff;">
                      <span style="font-size:12px;color:#94a3b8;display:block;margin-bottom:3px;">Email</span>
                      <span style="font-size:14px;font-weight:600;color:#0f172a;">${to}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;">
                      <span style="font-size:12px;color:#94a3b8;display:block;margin-bottom:3px;">Temporary Password</span>
                      <span style="font-size:18px;font-weight:800;color:#4f46e5;letter-spacing:2px;font-family:monospace;">${password}</span>
                    </td>
                  </tr>
                </table>
              </div>

              <p style="color:#f59e0b;font-size:12px;font-weight:600;margin:0 0 24px;background:#fffbeb;padding:10px 14px;border-radius:10px;border:1px solid #fde68a;">
                ⚠️ Please change your password after your first login from the Profile page.
              </p>

              <!-- CTA Button -->
              <div style="text-align:center;margin-bottom:28px;">
                <a href="${loginUrl}"
                  style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:50px;letter-spacing:0.3px;">
                  Login to SplitEase →
                </a>
              </div>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px;">
              <p style="color:#94a3b8;font-size:12px;margin:0;text-align:center;">
                If you weren't expecting this, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} SplitEase &nbsp;·&nbsp; Split expenses, stay friends.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return transporter.sendMail({
    from: FROM,
    to,
    subject: `${inviterName} added you to "${groupName}" on SplitEase`,
    html,
  });
}

/** Sent to an existing user who was added to a new group */
export async function sendGroupAddedEmail({
  to,
  name,
  groupName,
  inviterName,
}: {
  to: string;
  name: string;
  groupName: string;
  inviterName: string;
}) {
  const groupsUrl = `${APP_URL}/`;
  const transporter = createTransporter();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>You've been added to a group on SplitEase</title>
</head>
<body style="margin:0;padding:0;background:#f8f5ff;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f5ff;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(79,70,229,0.10);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:36px 40px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:16px;padding:10px 20px;">
                <span style="background:white;border-radius:10px;width:32px;height:32px;display:inline-block;line-height:32px;text-align:center;font-weight:900;color:#4f46e5;font-size:16px;">S</span>
                &nbsp;
                <span style="color:white;font-weight:900;font-size:20px;letter-spacing:-0.5px;vertical-align:middle;">SplitEase</span>
              </div>
              <div style="margin-top:20px;font-size:32px;">👥</div>
              <h1 style="color:white;font-size:22px;font-weight:800;margin:8px 0 4px;">Added to a new group!</h1>
              <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">
                <strong>${inviterName}</strong> added you to <strong>${groupName}</strong>
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="color:#0f172a;font-size:15px;margin:0 0 24px;">Hi <strong>${name}</strong>,</p>
              <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 28px;">
                <strong>${inviterName}</strong> has added you to the group <strong>"${groupName}"</strong> on SplitEase.
                You can now view shared expenses and settle up with your group members.
              </p>

              <div style="text-align:center;margin-bottom:28px;">
                <a href="${groupsUrl}"
                  style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:50px;letter-spacing:0.3px;">
                  View Group on SplitEase →
                </a>
              </div>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px;">
              <p style="color:#94a3b8;font-size:12px;margin:0;text-align:center;">
                If you weren't expecting this, please contact your group admin.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} SplitEase &nbsp;·&nbsp; Split expenses, stay friends.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return transporter.sendMail({
    from: FROM,
    to,
    subject: `${inviterName} added you to "${groupName}" on SplitEase`,
    html,
  });
}

/** Sent to the person who owes money as a payment reminder */
export async function sendReminderEmail({
  to,
  toName,
  fromName,
  amount,
  currency,
  groupName,
}: {
  to: string;
  toName: string;
  fromName: string;
  amount: number;
  currency: string;
  groupName: string;
}) {
  const loginUrl = `${APP_URL}/auth/signin`;
  const transporter = createTransporter();

  const currencySymbols: Record<string, string> = {
    INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥", AED: "د.إ",
  };
  const sym = currencySymbols[currency] || currency;
  const formattedAmount = `${sym}${amount.toFixed(2)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f8f5ff;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f5ff;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(79,70,229,0.10);">
        <tr>
          <td style="background:linear-gradient(135deg,#f59e0b,#ef4444);padding:36px 40px;text-align:center;">
            <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:16px;padding:10px 20px;">
              <span style="background:white;border-radius:10px;width:32px;height:32px;display:inline-block;line-height:32px;text-align:center;font-weight:900;color:#4f46e5;font-size:16px;">S</span>
              &nbsp;<span style="color:white;font-weight:900;font-size:20px;vertical-align:middle;">SplitEase</span>
            </div>
            <div style="margin-top:20px;font-size:32px;">🔔</div>
            <h1 style="color:white;font-size:22px;font-weight:800;margin:8px 0 4px;">Friendly Payment Reminder</h1>
            <p style="color:rgba(255,255,255,0.9);font-size:14px;margin:0;"><strong>${fromName}</strong> sent you a reminder</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="color:#0f172a;font-size:15px;margin:0 0 24px;">Hi <strong>${toName}</strong>,</p>
            <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 28px;">
              Just a friendly nudge — <strong>${fromName}</strong> is reminding you about a pending payment in the group <strong>"${groupName}"</strong>.
            </p>
            <div style="background:linear-gradient(135deg,#fff7ed,#fef3c7);border:1.5px solid #fed7aa;border-radius:16px;padding:28px;margin-bottom:28px;text-align:center;">
              <p style="font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 12px;">You owe</p>
              <p style="font-size:42px;font-weight:900;color:#b45309;margin:0 0 8px;letter-spacing:-1px;">${formattedAmount}</p>
              <p style="font-size:13px;color:#92400e;margin:0;">to <strong>${fromName}</strong> in <strong>${groupName}</strong></p>
            </div>
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:50px;">
                Settle Up on SplitEase →
              </a>
            </div>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px;">
            <p style="color:#94a3b8;font-size:12px;margin:0;text-align:center;">This is an automated reminder sent via SplitEase.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="color:#94a3b8;font-size:12px;margin:0;">© ${new Date().getFullYear()} SplitEase · Split expenses, stay friends.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return transporter.sendMail({
    from: FROM,
    to,
    subject: `💸 Reminder: You owe ${formattedAmount} to ${fromName} on SplitEase`,
    html,
  });
}
