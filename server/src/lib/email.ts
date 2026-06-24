import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // use STARTTLS on port 587
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

export const sendOTP = async (toEmail: string, otp: string) => {
  const mailOptions = {
    from: process.env.EMAIL_USER || 'your-email@gmail.com',
    to: toEmail,
    subject: 'KGP Lost and Found - WhatsApp Verification OTP',
    text: `Your OTP for verifying your WhatsApp number on KGP Lost and Found is: ${otp}\n\nPlease enter this code in your WhatsApp chat. Do not share it with anyone.`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Email] OTP sent to ${toEmail}`);
  } catch (error: any) {
    console.error(`[Email] Failed to send OTP to ${toEmail}:`);
    console.error(`[Email] Error code: ${error.code}`);
    console.error(`[Email] Error message: ${error.message}`);
    if (error.response) console.error(`[Email] SMTP response: ${error.response}`);
    throw error;
  }
};
