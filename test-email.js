require("dotenv").config();

const {
  sendEmail,
  verifyEmailConnection,
} = require("./emailService");

async function test() {
  console.log("Testing Gmail connection...");

  const connected = await verifyEmailConnection();

  if (!connected) {
    process.exit(1);
  }

  try {
    await sendEmail({
      to: "heerachugh747@gmail.com",
      subject: "DSSL Email System Test",
      html: `
        <div style="font-family:Arial,sans-serif;padding:30px;">
          <h2 style="color:#1f4e8c;">DSSL Email System</h2>

          <p>Hello,</p>

          <p>
            This is a test email from the
            <strong>DSSL Email System</strong>.
          </p>

          <p>
            Gmail SMTP is working successfully.
          </p>

          <br>

          <p>
            Regards,<br>
            <strong>DSSL Team</strong>
          </p>
        </div>
      `,
    });

    console.log("✅ TEST EMAIL SENT SUCCESSFULLY");
  } catch (error) {
    console.error("❌ EMAIL SENDING FAILED");
    console.error(error.message);
  }
}

test();