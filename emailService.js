const nodemailer = require("nodemailer");

// Create reusable transporter using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 587),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

/**
 * Validate email address format
 */
function validateEmail(email) {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(trimmed);
}

/**
 * Sanitize plain text for safe HTML embedding
 */
function sanitizeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Format date and time in Indian Standard Time (IST)
 */
function formatIST(dateInput) {
  if (!dateInput) return "To Be Announced";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "To Be Announced";

  // Format with options in Asia/Kolkata
  const options = {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };
  return new Intl.DateTimeFormat("en-IN", options).format(date) + " (IST)";
}

/**
 * Generate modern, branded HTML template for DSSL Match Reminders
 */
function buildEventReminderHTML({
  playerName,
  sportName,
  dalAName,
  dalAColor = "#DD6B20",
  dalBName,
  dalBColor = "#3182CE",
  venue,
  startTime,
  matchRound,
  customNote,
  tournamentName = "DSSPL 2026",
}) {
  const formattedTime = formatIST(startTime);
  const safePlayerName = sanitizeHtml(playerName || "Valued Athlete");
  const safeSport = sanitizeHtml(sportName || "Sports Event");
  const safeDalA = sanitizeHtml(dalAName || "Team A");
  const safeDalB = sanitizeHtml(dalBName || "Team B");
  const safeVenue = sanitizeHtml(venue || "Main Sports Complex");
  const safeRound = sanitizeHtml(matchRound || "League Match");
  const safeCustomNote = customNote ? sanitizeHtml(customNote).replace(/\n/g, "<br>") : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Match Reminder - ${tournamentName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 620px; background-color: #121826; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          
          <!-- Header Bar -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 28px 32px 22px 32px; border-bottom: 2px solid #ffbc01; text-align: center;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <span style="display: inline-block; background-color: rgba(255, 188, 1, 0.15); border: 1px solid #ffbc01; color: #ffbc01; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; padding: 5px 14px; border-radius: 20px; margin-bottom: 12px;">
                      Official Match Notification
                    </span>
                    <h1 style="margin: 8px 0 0 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 0.5px;">
                      ${tournamentName}
                    </h1>
                    <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px; font-weight: 500;">
                      Dev Sanskriti Sports Premier League
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 32px 20px 32px;">
              <!-- Greeting -->
              <p style="margin: 0 0 18px 0; color: #f8fafc; font-size: 16px; line-height: 1.6;">
                Dear <strong style="color: #ffbc01;">${safePlayerName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                Get ready! You have an upcoming fixture scheduled in <strong>${safeSport}</strong>. Here are the official match details and schedule instructions:
              </p>

              <!-- Matchup Card -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background: linear-gradient(145deg, #1a2234 0%, #151b2b 100%); border-radius: 12px; border: 1px solid #2d3748; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #ffbc01; margin-bottom: 12px;">
                      ${safeRound} &bull; ${safeSport}
                    </div>

                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <!-- Team A -->
                        <td width="42%" align="center" style="vertical-align: middle;">
                          <div style="font-size: 16px; font-weight: 800; color: #ffffff; margin-bottom: 4px;">
                            ${safeDalA}
                          </div>
                          <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: ${dalAColor}; border: 1px solid rgba(255,255,255,0.4);"></span>
                        </td>

                        <!-- VS Divider -->
                        <td width="16%" align="center" style="vertical-align: middle;">
                          <span style="display: inline-block; background-color: #2a3449; color: #ffbc01; font-size: 12px; font-weight: 900; padding: 6px 10px; border-radius: 50px; border: 1px solid #3e4c66;">
                            VS
                          </span>
                        </td>

                        <!-- Team B -->
                        <td width="42%" align="center" style="vertical-align: middle;">
                          <div style="font-size: 16px; font-weight: 800; color: #ffffff; margin-bottom: 4px;">
                            ${safeDalB}
                          </div>
                          <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: ${dalBColor}; border: 1px solid rgba(255,255,255,0.4);"></span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Match Schedule Details Table -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f1523; border-radius: 10px; border: 1px solid #1e293b; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #1e293b;" width="35%">
                    <span style="color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">📅 Date & Time</span>
                  </td>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #1e293b;">
                    <strong style="color: #ffffff; font-size: 14px;">${formattedTime}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #1e293b;">
                    <span style="color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">📍 Venue</span>
                  </td>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #1e293b;">
                    <strong style="color: #ffffff; font-size: 14px;">${safeVenue}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 18px;">
                    <span style="color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">🏆 Sport & Stage</span>
                  </td>
                  <td style="padding: 14px 18px;">
                    <strong style="color: #ffffff; font-size: 14px;">${safeSport} (${safeRound})</strong>
                  </td>
                </tr>
              </table>

              ${safeCustomNote ? `
              <!-- Admin Custom Note -->
              <div style="background-color: rgba(255, 188, 1, 0.08); border-left: 4px solid #ffbc01; padding: 14px 18px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <div style="color: #ffbc01; font-weight: 700; font-size: 12px; text-transform: uppercase; margin-bottom: 6px;">
                  Notice from Organizing Committee
                </div>
                <div style="color: #e2e8f0; font-size: 13px; line-height: 1.5;">
                  ${safeCustomNote}
                </div>
              </div>
              ` : ""}

              <!-- Athlete Checklist -->
              <div style="background-color: #171f30; border-radius: 10px; padding: 18px; margin-bottom: 24px; border: 1px solid #232f48;">
                <div style="color: #ffffff; font-weight: 700; font-size: 13px; margin-bottom: 10px;">
                  ⚠️ Mandatory Athlete Guidelines:
                </div>
                <ul style="margin: 0; padding-left: 18px; color: #94a3b8; font-size: 12px; line-height: 1.7;">
                  <li>Arrive at the designated venue at least <strong>30 minutes prior</strong> to scheduled start time.</li>
                  <li>Wear your official Mandal sports kit / appropriate athletic attire and shoes.</li>
                  <li>Carry your university student ID card or scholar number confirmation.</li>
                  <li>Adhere strictly to sportsmanship principles and referee / coordinator decisions.</li>
                </ul>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0c101a; padding: 24px 32px; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #ffffff; font-size: 13px; font-weight: 700;">
                DSSL Organizing Committee
              </p>
              <p style="margin: 0 0 12px 0; color: #64748b; font-size: 11px; line-height: 1.5;">
                Dev Sanskriti Vishwavidyalaya, Haridwar, Uttarakhand<br>
                For any queries or schedule clarifications, contact your Mandal Captain or the Sports Desk.
              </p>
              <p style="margin: 0; color: #475569; font-size: 10px;">
                This is an automated match alert sent via the DSSL Event Management System.<br>
                Please do not reply directly to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Send an email directly
 */
async function sendEmail({ to, subject, html }) {
  if (!to) throw new Error("Recipient email is required");
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || "DSSL Team <dsspl.team@gmail.com>",
    to,
    subject,
    html,
  });
  console.log(`[EmailService] Sent to ${to}: ${info.messageId}`);
  return info;
}

/**
 * Verify SMTP connection
 */
async function verifyEmailConnection() {
  try {
    await transporter.verify();
    console.log("✅ Gmail SMTP connection verified successfully");
    return { success: true, message: "Gmail SMTP connected and verified" };
  } catch (error) {
    console.error("❌ Gmail SMTP connection failed:", error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Helper to sleep for rate limiting
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Send bulk match reminders to a list of players and record logs in Prisma
 */
async function sendBulkMatchReminders({
  match,
  players,
  customNote = "",
  emailType = "manual",
  prisma,
}) {
  const results = {
    total: players.length,
    sent: 0,
    failed: 0,
    errors: [],
  };

  const subject = `[DSSL Match Reminder] ${match.sportName}: ${match.dalA?.name || "Team A"} vs ${match.dalB?.name || "Team B"}`;

  for (const player of players) {
    const recipientEmail = player.email?.trim();

    if (!recipientEmail || !validateEmail(recipientEmail)) {
      results.failed++;
      results.errors.push({ player: player.name, error: "Invalid or empty email address" });

      if (prisma && prisma.emailLog) {
        try {
          await prisma.emailLog.create({
            data: {
              matchId: match.id ? parseInt(match.id) : null,
              recipientEmail: recipientEmail || "unknown",
              recipientName: player.name || "Unknown",
              subject,
              message: customNote || "",
              emailType,
              status: "failed",
              errorMessage: "Invalid or empty email address",
            },
          });
        } catch (logErr) {
          console.error("Failed to write email log:", logErr.message);
        }
      }
      continue;
    }

    const htmlContent = buildEventReminderHTML({
      playerName: player.name,
      sportName: match.sportName,
      dalAName: match.dalA?.name,
      dalAColor: match.dalA?.color,
      dalBName: match.dalB?.name,
      dalBColor: match.dalB?.color,
      venue: match.venue,
      startTime: match.startTime,
      matchRound: match.matchRound || "Upcoming Match",
      customNote,
      tournamentName: match.tournamentName || "DSSPL 2026",
    });

    try {
      await sendEmail({
        to: recipientEmail,
        subject,
        html: htmlContent,
      });

      results.sent++;

      if (prisma && prisma.emailLog) {
        await prisma.emailLog.create({
          data: {
            matchId: match.id ? parseInt(match.id) : null,
            recipientEmail,
            recipientName: player.name || "",
            subject,
            message: customNote || "",
            emailType,
            status: "sent",
            sentAt: new Date(),
          },
        });
      }
    } catch (err) {
      console.error(`Failed to send email to ${recipientEmail}:`, err.message);
      results.failed++;
      results.errors.push({ player: player.name, email: recipientEmail, error: err.message });

      if (prisma && prisma.emailLog) {
        try {
          await prisma.emailLog.create({
            data: {
              matchId: match.id ? parseInt(match.id) : null,
              recipientEmail,
              recipientName: player.name || "",
              subject,
              message: customNote || "",
              emailType,
              status: "failed",
              errorMessage: err.message || "Unknown sending error",
            },
          });
        } catch (logErr) {
          console.error("Failed to write email log:", logErr.message);
        }
      }
    }

    // Small delay between sends to respect Gmail rate limits
    await sleep(200);
  }

  return results;
}

/**
 * Branded HTML email for direct Google Sheet registration announcements & reminders
 */
function buildGeneralAnnouncementHTML({
  playerName,
  subject,
  message,
  mandalName,
  sportName,
  teamRegistrationId,
  scholarNo,
  recipientEmail,
  tournamentName = "DSSPL 2026",
}) {
  const safeName = sanitizeHtml(playerName || "Athlete");
  const safeSubject = sanitizeHtml(subject || "Event Announcement");
  const safeMessage = sanitizeHtml(message || "Please check tournament notice board for event details.").replace(/\n/g, "<br>");
  const safeMandal = sanitizeHtml(mandalName || "Registered Mandal");
  const safeSport = sanitizeHtml(sportName || "DSSL Sports");
  const safeRegId = sanitizeHtml(teamRegistrationId || scholarNo || "DSSL-2026");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeSubject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b0f19; min-height: 100vh; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 32px 30px; text-align: center; border-bottom: 2px solid #ffbc01;">
              <div style="color: #ffbc01; font-size: 26px; font-weight: 800; letter-spacing: 2px; margin-bottom: 6px; text-transform: uppercase;">
                ${tournamentName}
              </div>
              <div style="color: #94a3b8; font-size: 13px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase;">
                Dev Sanskriti Sports Premier League &bull; Event Notification
              </div>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 32px 30px;">
              <h2 style="margin: 0 0 16px 0; color: #f8fafc; font-size: 20px; font-weight: 700;">
                Dear ${safeName},
              </h2>

              <!-- Registration Details Badge Card -->
              <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
                <div style="font-size: 11px; font-weight: 700; color: #ffbc01; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">
                  📋 Verified Registration Details (Google Sheets)
                </div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 13px;">
                  <tr>
                    <td style="padding: 4px 0; color: #94a3b8; width: 40%;">Sport:</td>
                    <td style="padding: 4px 0; color: #f8fafc; font-weight: 600;">${safeSport}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #94a3b8;">Mandal:</td>
                    <td style="padding: 4px 0; color: #f8fafc; font-weight: 600;">${safeMandal}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #94a3b8;">Registration / Scholar ID:</td>
                    <td style="padding: 4px 0; color: #f8fafc; font-weight: 600;">${safeRegId}</td>
                  </tr>
                </table>
              </div>

              <!-- Announcement Message -->
              <div style="background-color: rgba(255, 188, 1, 0.05); border-left: 4px solid #ffbc01; padding: 16px 20px; border-radius: 4px 12px 12px 4px; margin-bottom: 24px; color: #cbd5e1; font-size: 14px; line-height: 1.7;">
                ${safeMessage}
              </div>

              <!-- Athlete Guidelines Card -->
              <div style="background-color: #0f172a; border: 1px dashed #334155; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <div style="color: #f1f5f9; font-size: 13px; font-weight: 700; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
                  📌 Important Guidelines for Athletes:
                </div>
                <ul style="margin: 0; padding-left: 20px; color: #94a3b8; font-size: 12px; line-height: 1.8;">
                  <li>Arrive at the designated sports ground 30 minutes before your scheduled event.</li>
                  <li>Wear proper sports attire and footwear appropriate for your sport.</li>
                  <li>Carry your University Student ID Card for verification at the reporting desk.</li>
                  <li>Maintain sportsmanship and strictly follow the referee/umpire directives.</li>
                </ul>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #090d16; padding: 24px 30px; text-align: center; border-top: 1px solid #1e293b;">
              <p style="margin: 0 0 6px 0; color: #94a3b8; font-size: 12px; font-weight: 600;">
                DSSL Organizing Committee &bull; Sports & Cultural Council
              </p>
              <p style="margin: 0 0 12px 0; color: #64748b; font-size: 11px; line-height: 1.5;">
                Dev Sanskriti Vishwavidyalaya, Haridwar, Uttarakhand<br>
                For any queries, contact your Mandal Captain or the Central Sports Desk.
              </p>
              <p style="margin: 0; color: #475569; font-size: 10px;">
                This notification was sent to ${sanitizeHtml(recipientEmail || "")} based on your DSSL Google Sheet registration.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Send bulk direct emails to Google Sheet registered athletes and record in Prisma emailLog
 */
async function sendBulkDirectEmails({
  recipients,
  subject,
  message,
  emailType = "manual_sheet",
  prisma,
}) {
  const results = {
    total: recipients.length,
    sent: 0,
    failed: 0,
    errors: [],
  };

  const finalSubject = subject || "[DSSPL 2026] Important Event & Registration Update";

  for (const athlete of recipients) {
    const recipientEmail = (athlete.email || "").trim().toLowerCase();

    if (!recipientEmail || !validateEmail(recipientEmail)) {
      results.failed++;
      results.errors.push({ player: athlete.name, error: "Invalid or empty email address" });

      if (prisma && prisma.emailLog) {
        try {
          await prisma.emailLog.create({
            data: {
              matchId: null,
              recipientEmail: recipientEmail || "unknown",
              recipientName: athlete.name || "Unknown",
              subject: finalSubject,
              message: message || "",
              emailType,
              status: "failed",
              errorMessage: "Invalid or empty email address",
            },
          });
        } catch (logErr) {
          console.error("Failed to write email log:", logErr.message);
        }
      }
      continue;
    }

    const htmlContent = buildGeneralAnnouncementHTML({
      playerName: athlete.name,
      subject: finalSubject,
      message,
      mandalName: athlete.mandalName || athlete.mandal,
      sportName: athlete.sport,
      teamRegistrationId: athlete.teamRegistrationId,
      scholarNo: athlete.scholarNo,
      recipientEmail,
    });

    try {
      await sendEmail({
        to: recipientEmail,
        subject: finalSubject,
        html: htmlContent,
      });

      results.sent++;

      if (prisma && prisma.emailLog) {
        await prisma.emailLog.create({
          data: {
            matchId: null,
            recipientEmail,
            recipientName: athlete.name || "",
            subject: finalSubject,
            message: message || "",
            emailType,
            status: "sent",
            sentAt: new Date(),
          },
        });
      }
    } catch (err) {
      console.error(`Failed to send email to ${recipientEmail}:`, err.message);
      results.failed++;
      results.errors.push({ player: athlete.name, email: recipientEmail, error: err.message });

      if (prisma && prisma.emailLog) {
        try {
          await prisma.emailLog.create({
            data: {
              matchId: null,
              recipientEmail,
              recipientName: athlete.name || "",
              subject: finalSubject,
              message: message || "",
              emailType,
              status: "failed",
              errorMessage: err.message || "Unknown sending error",
            },
          });
        } catch (logErr) {
          console.error("Failed to write email log:", logErr.message);
        }
      }
    }

    // Small delay between sends to respect Gmail rate limits
    await sleep(200);
  }

  return results;
}

module.exports = {
  transporter,
  validateEmail,
  sanitizeHtml,
  formatIST,
  buildEventReminderHTML,
  buildGeneralAnnouncementHTML,
  sendEmail,
  verifyEmailConnection,
  sendBulkMatchReminders,
  sendBulkDirectEmails,
};