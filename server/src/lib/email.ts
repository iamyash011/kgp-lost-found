import { Resend } from 'resend';
import nodemailer from 'nodemailer';

// ─── Resend (HTTP API — works on Render) ─────────────────
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

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

export const sendOTP = async (toEmail: string, otp: string) => {
  const subject = 'KGP Lost and Found - WhatsApp Verification OTP';
  const text = `Your OTP for verifying your WhatsApp number on KGP Lost and Found is: ${otp}\n\nPlease enter this code in your WhatsApp chat. Do not share it with anyone.`;

  // Try Resend first (HTTP — works on cloud), then Gmail SMTP fallback
  if (resend) {
    try {
      await resend.emails.send({
        from: 'KGPFind <onboarding@resend.dev>',
        to: toEmail,
        subject,
        text,
      });
      console.log(`[Resend] OTP sent to ${toEmail}`);
      return;
    } catch (error: any) {
      console.error(`[Resend] Failed:`, error.message);
      // Fall through to SMTP
    }
  }

  // Fallback: Gmail SMTP (works locally)
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: toEmail,
      subject,
      text,
    });
    console.log(`[SMTP] OTP sent to ${toEmail}`);
  } catch (error: any) {
    console.error(`[SMTP] Failed to send OTP to ${toEmail}:`);
    console.error(`[SMTP] Error code: ${error.code}`);
    console.error(`[SMTP] Error message: ${error.message}`);
    throw error;
  }
};
