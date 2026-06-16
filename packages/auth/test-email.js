import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config({ path: "../../apps/server/.env" });

async function test() {
  console.log("=== Hostinger SMTP Test ===");
  console.log("EMAIL_FROM:", process.env.EMAIL_FROM);
  console.log("SMTP_HOST:", process.env.SMTP_HOST);
  console.log("SMTP_PORT:", process.env.SMTP_PORT);
  console.log("SMTP_SECURE:", process.env.SMTP_SECURE);
  console.log("SMTP_USER:", process.env.SMTP_USER);
  console.log("SMTP_PASS length:", process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    logger: true,
    debug: true,
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.SMTP_USER, // Send to self
      subject: "Test Email from HiverTrader Auth",
      text: "If you receive this email, SMTP authentication and delivery are working correctly.",
      html: "<p>If you receive this email, SMTP authentication and delivery are working correctly.</p>",
    });
    console.log("\n[SUCCESS] Test email sent successfully!");
    console.log("Message ID:", info.messageId);
    console.log("Response:", info.response);
  } catch (error) {
    console.error("\n[ERROR] Failed to send test email:");
    console.error(error);
  }
}

test();
