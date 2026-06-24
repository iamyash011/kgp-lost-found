import nodemailer from 'nodemailer';

// ─── Gmail SMTP fallback (works locally, blocked on Render) ─
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 10000,
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// ─── Send OTP via Brevo HTTP API (primary) → Resend → Gmail SMTP (fallback) ─
export const sendOTP = async (toEmail: string, otp: string) => {
  const subject = 'KGP Lost and Found - WhatsApp Verification OTP';
  const textContent = `Your OTP for verifying your WhatsApp number on KGP Lost and Found is: ${otp}\n\nPlease enter this code in your WhatsApp chat. Do not share it with anyone.`;
  const senderEmail = process.env.EMAIL_USER || 'kgp.lost.found@gmail.com';

  // 1️⃣ Try Brevo (300/day free, HTTP API)
  if (process.env.BREVO_API_KEY) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'KGPFind', email: senderEmail },
          to: [{ email: toEmail }],
          subject,
          textContent,
        }),
      });

      if (response.ok) {
        console.log(`[Brevo] OTP sent to ${toEmail}`);
        return;
      }

      const errorBody = await response.text();
      console.error(`[Brevo] Failed (${response.status}):`, errorBody);
      // Fall through to next provider
    } catch (error: any) {
      console.error(`[Brevo] Error:`, error.message);
    }
  }

  // 2️⃣ Try Resend (100/day free, HTTP API)
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'KGPFind <onboarding@resend.dev>',
          to: toEmail,
          subject,
          text: textContent,
        }),
      });

      if (response.ok) {
        console.log(`[Resend] OTP sent to ${toEmail}`);
        return;
      }

      const errorBody = await response.text();
      console.error(`[Resend] Failed (${response.status}):`, errorBody);
    } catch (error: any) {
      console.error(`[Resend] Error:`, error.message);
    }
  }

  // 3️⃣ Fallback: Gmail SMTP (works locally)
  try {
    await transporter.sendMail({
      from: senderEmail,
      to: toEmail,
      subject,
      text: textContent,
    });
    console.log(`[SMTP] OTP sent to ${toEmail}`);
  } catch (error: any) {
    console.error(`[SMTP] Failed to send OTP to ${toEmail}: ${error.code} ${error.message}`);
    throw error;
  }
};
