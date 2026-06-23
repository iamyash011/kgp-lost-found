import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import prisma from './prisma';
import { sendOTP } from './email';
import { findAndStoreMatches } from './matching';
import { setWhatsAppClient } from './notifier';
import { v2 as cloudinary } from 'cloudinary';
import { containsProfanity } from './moderation';

const WEBSITE_URL = process.env.WEBSITE_URL || 'https://kgp-lost-found.vercel.app';

// ─── Conversation State Machine ───────────────────────────
enum ConversationStep {
  IDLE = 'IDLE',
  AWAITING_EMAIL = 'AWAITING_EMAIL',
  AWAITING_OTP = 'AWAITING_OTP',
  VERIFIED_MENU = 'VERIFIED_MENU',
  AWAITING_TYPE = 'AWAITING_TYPE',
  AWAITING_TITLE = 'AWAITING_TITLE',
  AWAITING_CATEGORY = 'AWAITING_CATEGORY',
  AWAITING_COLOR = 'AWAITING_COLOR',
  AWAITING_BRAND = 'AWAITING_BRAND',
  AWAITING_DATE = 'AWAITING_DATE',
  AWAITING_DESCRIPTION = 'AWAITING_DESCRIPTION',
  AWAITING_LOCATION = 'AWAITING_LOCATION',
  AWAITING_IDENTIFYING_MARKS = 'AWAITING_IDENTIFYING_MARKS',
  AWAITING_URGENCY = 'AWAITING_URGENCY',
  AWAITING_REWARD = 'AWAITING_REWARD',
  AWAITING_IMAGE = 'AWAITING_IMAGE',
  AWAITING_PRIVACY_NAME = 'AWAITING_PRIVACY_NAME',
  AWAITING_PRIVACY_WHATSAPP = 'AWAITING_PRIVACY_WHATSAPP',
  AWAITING_CONFIRM = 'AWAITING_CONFIRM',
}

interface ConversationState {
  step: ConversationStep;
  userId?: string;
  email?: string;
  otp?: string;
  otpExpiry?: number;
  itemData: {
    type?: 'LOST' | 'FOUND';
    title?: string;
    category?: string;
    color?: string;
    brand?: string;
    dateOccurred?: string;
    description?: string;
    location?: string;
    identifyingMarks?: string;
    urgency?: 'NORMAL' | 'URGENT';
    reward?: string;
    imageUrl?: string;
    showPosterName?: boolean;
    showPosterWhatsapp?: boolean;
  };
  lastActivity: number;
}

const CATEGORIES = [
  'Electronics', 'Documents & IDs', 'Clothing & Accessories', 'Bags & Wallets',
  'Keys', 'Stationery', 'Sports Equipment', 'Books', 'Water Bottles', 'Other',
];

const COLORS = [
  'Black', 'White', 'Silver', 'Blue', 'Red', 'Green', 'Brown', 'Gold',
  'Pink', 'Orange', 'Yellow', 'Purple', 'Grey', 'Transparent', 'Other',
];

// ─── Session Store ────────────────────────────────────────
const sessions = new Map<string, ConversationState>();

const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

function getSession(chatId: string): ConversationState {
  let session = sessions.get(chatId);
  if (!session) {
    session = {
      step: ConversationStep.IDLE,
      itemData: {},
      lastActivity: Date.now(),
    };
    sessions.set(chatId, session);
  }
  session.lastActivity = Date.now();
  return session;
}

function resetSession(chatId: string) {
  sessions.delete(chatId);
}

// Clean up stale sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [chatId, session] of sessions.entries()) {
    if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
      sessions.delete(chatId);
    }
  }
}, 5 * 60 * 1000);

// ─── Helpers ──────────────────────────────────────────────
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function extractWhatsAppNumber(chatId: string): string {
  // chatId format: 91XXXXXXXXXX@c.us → extract the 10-digit number
  const match = chatId.replace('@c.us', '');
  if (match.startsWith('91') && match.length === 12) {
    return match.substring(2); // Remove country code
  }
  return match;
}

async function uploadImageToCloudinary(media: MessageMedia): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'kgp_lost_found',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result!.secure_url);
      }
    );
    const buffer = Buffer.from(media.data, 'base64');
    uploadStream.end(buffer);
  });
}

// ─── Message Handler ──────────────────────────────────────
async function handleMessage(client: Client, chatId: string, messageBody: string, message: any) {
  const session = getSession(chatId);
  const body = messageBody.trim();
  const bodyLower = body.toLowerCase();

  // Global commands available at any time
  if (bodyLower === 'cancel') {
    const wasInFlow = session.step !== ConversationStep.IDLE && session.step !== ConversationStep.VERIFIED_MENU;
    if (session.userId) {
      // Keep them verified but reset item data
      session.step = ConversationStep.VERIFIED_MENU;
      session.itemData = {};
      if (wasInFlow) {
        await client.sendMessage(chatId, '❌ Item report cancelled.\n\n' + getMenuMessage());
      } else {
        await client.sendMessage(chatId, getMenuMessage());
      }
    } else {
      resetSession(chatId);
      await client.sendMessage(chatId, '❌ Cancelled. Send *hi* to start again.');
    }
    return;
  }

  if (bodyLower === 'menu' && session.userId) {
    session.step = ConversationStep.VERIFIED_MENU;
    session.itemData = {};
    await client.sendMessage(chatId, getMenuMessage());
    return;
  }

  // Route based on current step
  switch (session.step) {
    case ConversationStep.IDLE:
      await handleIdle(client, chatId, session);
      break;
    case ConversationStep.AWAITING_EMAIL:
      await handleEmail(client, chatId, body, session);
      break;
    case ConversationStep.AWAITING_OTP:
      await handleOTPVerification(client, chatId, body, session);
      break;
    case ConversationStep.VERIFIED_MENU:
      await handleMenu(client, chatId, bodyLower, session);
      break;
    case ConversationStep.AWAITING_TYPE:
      await handleType(client, chatId, bodyLower, session);
      break;
    case ConversationStep.AWAITING_TITLE:
      await handleTitle(client, chatId, body, session);
      break;
    case ConversationStep.AWAITING_CATEGORY:
      await handleCategory(client, chatId, body, session);
      break;
    case ConversationStep.AWAITING_COLOR:
      await handleColor(client, chatId, body, session);
      break;
    case ConversationStep.AWAITING_BRAND:
      await handleBrand(client, chatId, body, session);
      break;
    case ConversationStep.AWAITING_DATE:
      await handleDate(client, chatId, body, session);
      break;
    case ConversationStep.AWAITING_DESCRIPTION:
      await handleDescription(client, chatId, body, session);
      break;
    case ConversationStep.AWAITING_LOCATION:
      await handleLocation(client, chatId, body, session);
      break;
    case ConversationStep.AWAITING_IDENTIFYING_MARKS:
      await handleIdentifyingMarks(client, chatId, body, session);
      break;
    case ConversationStep.AWAITING_URGENCY:
      await handleUrgency(client, chatId, bodyLower, session);
      break;
    case ConversationStep.AWAITING_REWARD:
      await handleReward(client, chatId, body, session);
      break;
    case ConversationStep.AWAITING_IMAGE:
      await handleImage(client, chatId, body, message, session);
      break;
    case ConversationStep.AWAITING_PRIVACY_NAME:
      await handlePrivacyName(client, chatId, bodyLower, session);
      break;
    case ConversationStep.AWAITING_PRIVACY_WHATSAPP:
      await handlePrivacyWhatsapp(client, chatId, bodyLower, session);
      break;
    case ConversationStep.AWAITING_CONFIRM:
      await handleConfirm(client, chatId, bodyLower, session);
      break;
  }
}

// ─── Step Handlers ────────────────────────────────────────

function getMenuMessage(): string {
  return `📋 *KGP Lost & Found — Menu*\n\nWhat would you like to do?\n\n*1.* Report a Lost item\n*2.* Report a Found item\n*3.* View all items on website\n\nReply with *1*, *2*, or *3*.\n\n🔗 ${WEBSITE_URL}`;
}

async function handleIdle(client: Client, chatId: string, session: ConversationState) {
  // Check if this WhatsApp number is already linked to a user
  const phoneNumber = extractWhatsAppNumber(chatId);
  const existingUser = await prisma.user.findFirst({
    where: { whatsappNumber: phoneNumber },
  });

  if (existingUser) {
    session.userId = existingUser.id;
    session.email = existingUser.email;
    session.step = ConversationStep.VERIFIED_MENU;
    await client.sendMessage(chatId,
      `👋 Welcome back, *${existingUser.name}*!\n\n` + getMenuMessage()
    );
    return;
  }

  session.step = ConversationStep.AWAITING_EMAIL;
  await client.sendMessage(chatId,
    `👋 *Welcome to KGP Lost & Found!*\n\n` +
    `I can help you report lost or found items on campus.\n\n` +
    `First, let's verify your identity.\n` +
    `Please enter your *IIT KGP email address*:\n` +
    `(e.g. yourname@iitkgp.ac.in)\n\n` +
    `🔗 Visit our website: ${WEBSITE_URL}`
  );
}

async function handleEmail(client: Client, chatId: string, body: string, session: ConversationState) {
  const email = body.toLowerCase().trim();

  // Validate IIT KGP email
  if (!email.endsWith('iitkgp.ac.in') && email !== 'kgp.lost.found@gmail.com') {
    await client.sendMessage(chatId,
      `❌ Only *IIT KGP email addresses* are allowed.\n\nPlease enter a valid email ending with *@iitkgp.ac.in*`
    );
    return;
  }

  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    await client.sendMessage(chatId, `❌ That doesn't look like a valid email. Please try again.`);
    return;
  }

  // Generate and send OTP
  const otp = generateOTP();
  session.email = email;
  session.otp = otp;
  session.otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes

  try {
    await sendOTP(email, otp);
    session.step = ConversationStep.AWAITING_OTP;
    await client.sendMessage(chatId,
      `📧 A *6-digit OTP* has been sent to *${email}*.\n\n` +
      `Please check your inbox (and spam folder) and reply with the code.\n\n` +
      `⏳ OTP expires in 5 minutes.`
    );
  } catch (error) {
    console.error('Failed to send OTP:', error);
    await client.sendMessage(chatId,
      `❌ Failed to send OTP. Please try again later or contact admin.\n\nType *cancel* to start over.`
    );
  }
}

async function handleOTPVerification(client: Client, chatId: string, body: string, session: ConversationState) {
  if (!session.otp || !session.otpExpiry) {
    session.step = ConversationStep.AWAITING_EMAIL;
    await client.sendMessage(chatId, `❌ Session expired. Please enter your email again.`);
    return;
  }

  if (Date.now() > session.otpExpiry) {
    session.otp = undefined;
    session.otpExpiry = undefined;
    session.step = ConversationStep.AWAITING_EMAIL;
    await client.sendMessage(chatId, `⏰ OTP expired! Please enter your email again to get a new one.`);
    return;
  }

  if (body.trim() !== session.otp) {
    await client.sendMessage(chatId, `❌ Incorrect OTP. Please try again or type *cancel* to start over.`);
    return;
  }

  // OTP verified! Link WhatsApp number to user account
  const phoneNumber = extractWhatsAppNumber(chatId);
  const email = session.email!;

  try {
    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Update existing user's WhatsApp number
      if (!user.whatsappNumber || user.whatsappNumber !== phoneNumber) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { whatsappNumber: phoneNumber },
        });
      }
    } else {
      // Create new user (they haven't used the website yet)
      user = await prisma.user.create({
        data: {
          googleId: `whatsapp-${phoneNumber}-${Date.now()}`,
          email,
          name: email.split('@')[0],
          whatsappNumber: phoneNumber,
        },
      });
    }

    session.userId = user.id;
    session.otp = undefined;
    session.otpExpiry = undefined;
    session.step = ConversationStep.VERIFIED_MENU;

    await client.sendMessage(chatId,
      `✅ *Verified successfully!*\n\n` +
      `Welcome, *${user.name}*! Your WhatsApp is now linked to your KGP Lost & Found account.\n\n` +
      getMenuMessage()
    );
  } catch (error) {
    console.error('Failed to link user:', error);
    await client.sendMessage(chatId,
      `❌ Something went wrong. Please try again.\n\nType *cancel* to start over.`
    );
  }
}

async function handleMenu(client: Client, chatId: string, body: string, session: ConversationState) {
  switch (body) {
    case '1':
      session.itemData = { type: 'LOST' };
      session.step = ConversationStep.AWAITING_TITLE;
      await client.sendMessage(chatId,
        `📝 *Reporting a LOST item*\n\n` +
        `What is the item?\n` +
        `(e.g. Milton Water Bottle, ID Card, JBL Earbuds)`
      );
      break;
    case '2':
      session.itemData = { type: 'FOUND' };
      session.step = ConversationStep.AWAITING_TITLE;
      await client.sendMessage(chatId,
        `📝 *Reporting a FOUND item*\n\n` +
        `What is the item?\n` +
        `(e.g. Milton Water Bottle, ID Card, JBL Earbuds)`
      );
      break;
    case '3':
      await client.sendMessage(chatId,
        `🔗 *View all items on our website:*\n\n${WEBSITE_URL}\n\n` +
        `Type *menu* to go back.`
      );
      break;
    default:
      await client.sendMessage(chatId, `Please reply with *1*, *2*, or *3*.\n\n` + getMenuMessage());
  }
}

async function handleType(client: Client, chatId: string, body: string, session: ConversationState) {
  // This is a fallback if someone reaches AWAITING_TYPE directly
  if (body === '1' || body === 'lost') {
    session.itemData.type = 'LOST';
  } else if (body === '2' || body === 'found') {
    session.itemData.type = 'FOUND';
  } else {
    await client.sendMessage(chatId, `Please reply with *1* for LOST or *2* for FOUND.`);
    return;
  }
  session.step = ConversationStep.AWAITING_TITLE;
  await client.sendMessage(chatId,
    `What is the item?\n(e.g. Milton Water Bottle, ID Card, JBL Earbuds)`
  );
}

async function handleTitle(client: Client, chatId: string, body: string, session: ConversationState) {
  if (body.length < 2) {
    await client.sendMessage(chatId, `Please provide a more descriptive title (at least 2 characters).`);
    return;
  }
  if (containsProfanity([body])) {
    await client.sendMessage(chatId, `❌ Title contains inappropriate language. Please try again.`);
    return;
  }
  session.itemData.title = body;
  session.step = ConversationStep.AWAITING_CATEGORY;

  const categoryList = CATEGORIES.map((c, i) => `*${i + 1}.* ${c}`).join('\n');
  await client.sendMessage(chatId,
    `📂 *Select a category:*\n\n${categoryList}\n\nReply with the *number* or type *skip*.`
  );
}

async function handleCategory(client: Client, chatId: string, body: string, session: ConversationState) {
  if (body.toLowerCase() === 'skip') {
    session.itemData.category = undefined;
  } else {
    const num = parseInt(body);
    if (num >= 1 && num <= CATEGORIES.length) {
      session.itemData.category = CATEGORIES[num - 1];
    } else {
      // Check if they typed the category name directly
      const match = CATEGORIES.find(c => c.toLowerCase() === body.toLowerCase());
      if (match) {
        session.itemData.category = match;
      } else {
        await client.sendMessage(chatId,
          `Please reply with a number (1-${CATEGORIES.length}) or type *skip*.`
        );
        return;
      }
    }
  }

  session.step = ConversationStep.AWAITING_COLOR;
  const colorList = COLORS.map((c, i) => `*${i + 1}.* ${c}`).join('\n');
  await client.sendMessage(chatId,
    `🎨 *Select a color:*\n\n${colorList}\n\nReply with the *number* or type *skip*.`
  );
}

async function handleColor(client: Client, chatId: string, body: string, session: ConversationState) {
  if (body.toLowerCase() === 'skip') {
    session.itemData.color = undefined;
  } else {
    const num = parseInt(body);
    if (num >= 1 && num <= COLORS.length) {
      session.itemData.color = COLORS[num - 1];
    } else {
      const match = COLORS.find(c => c.toLowerCase() === body.toLowerCase());
      if (match) {
        session.itemData.color = match;
      } else {
        await client.sendMessage(chatId,
          `Please reply with a number (1-${COLORS.length}) or type *skip*.`
        );
        return;
      }
    }
  }

  session.step = ConversationStep.AWAITING_BRAND;
  await client.sendMessage(chatId,
    `🏷️ *Brand?*\n(e.g. JBL, Samsung, Milton, Apple)\n\nType the brand name or *skip*.`
  );
}

async function handleBrand(client: Client, chatId: string, body: string, session: ConversationState) {
  if (body.toLowerCase() !== 'skip') {
    session.itemData.brand = body;
  }

  session.step = ConversationStep.AWAITING_DATE;
  const typeWord = session.itemData.type === 'LOST' ? 'lose' : 'find';
  await client.sendMessage(chatId,
    `📅 *When did you ${typeWord} it?*\n\n` +
    `Reply in format: *DD/MM/YYYY*\n` +
    `(e.g. 23/06/2026)\n\nOr type *skip*.`
  );
}

async function handleDate(client: Client, chatId: string, body: string, session: ConversationState) {
  if (body.toLowerCase() !== 'skip') {
    // Parse DD/MM/YYYY
    const dateRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
    const match = body.match(dateRegex);
    if (match) {
      const day = parseInt(match[1]);
      const month = parseInt(match[2]);
      const year = parseInt(match[3]);
      const date = new Date(year, month - 1, day);
      
      if (date > new Date()) {
        await client.sendMessage(chatId, `❌ Date cannot be in the future. Please try again or type *skip*.`);
        return;
      }
      
      session.itemData.dateOccurred = date.toISOString();
    } else {
      await client.sendMessage(chatId,
        `❌ Invalid date format. Please use *DD/MM/YYYY* (e.g. 23/06/2026) or type *skip*.`
      );
      return;
    }
  }

  session.step = ConversationStep.AWAITING_DESCRIPTION;
  await client.sendMessage(chatId,
    `📝 *Describe the item in detail:*\n\n` +
    `Include scratches, stickers, unique features, any details that help identify it.`
  );
}

async function handleDescription(client: Client, chatId: string, body: string, session: ConversationState) {
  if (body.length < 5) {
    await client.sendMessage(chatId, `Please provide a more detailed description (at least 5 characters).`);
    return;
  }
  if (containsProfanity([body])) {
    await client.sendMessage(chatId, `❌ Description contains inappropriate language. Please try again.`);
    return;
  }
  session.itemData.description = body;
  session.step = ConversationStep.AWAITING_LOCATION;

  const typeWord = session.itemData.type === 'LOST' ? 'lost' : 'found';
  await client.sendMessage(chatId,
    `📍 *Where was it ${typeWord}?*\n\n` +
    `(e.g. Nalanda Classroom Complex, LBS Hall, Tech Market, Main Building)`
  );
}

async function handleLocation(client: Client, chatId: string, body: string, session: ConversationState) {
  if (body.length < 2) {
    await client.sendMessage(chatId, `Please provide a location (at least 2 characters).`);
    return;
  }
  session.itemData.location = body;
  session.step = ConversationStep.AWAITING_IDENTIFYING_MARKS;
  await client.sendMessage(chatId,
    `🔍 *Any identifying marks?*\n\n` +
    `(e.g. scratch on base, red tape, name written on it)\n\nOr type *skip*.`
  );
}

async function handleIdentifyingMarks(client: Client, chatId: string, body: string, session: ConversationState) {
  if (body.toLowerCase() !== 'skip') {
    session.itemData.identifyingMarks = body;
  }

  // If LOST, ask urgency; otherwise skip to image
  if (session.itemData.type === 'LOST') {
    session.step = ConversationStep.AWAITING_URGENCY;
    await client.sendMessage(chatId,
      `⚡ *Urgency level?*\n\n*1.* Normal\n*2.* 🔥 Urgent\n\nReply with *1* or *2*.`
    );
  } else {
    session.itemData.urgency = 'NORMAL';
    session.step = ConversationStep.AWAITING_IMAGE;
    await client.sendMessage(chatId,
      `📸 *Send a photo of the item*, or type *skip* if you don't have one.`
    );
  }
}

async function handleUrgency(client: Client, chatId: string, body: string, session: ConversationState) {
  if (body === '1' || body === 'normal') {
    session.itemData.urgency = 'NORMAL';
  } else if (body === '2' || body === 'urgent') {
    session.itemData.urgency = 'URGENT';
  } else {
    await client.sendMessage(chatId, `Please reply *1* for Normal or *2* for Urgent.`);
    return;
  }

  session.step = ConversationStep.AWAITING_REWARD;
  await client.sendMessage(chatId,
    `💰 *Any reward for the finder?*\n\n(e.g. ₹500 reward)\n\nOr type *skip*.`
  );
}

async function handleReward(client: Client, chatId: string, body: string, session: ConversationState) {
  if (body.toLowerCase() !== 'skip') {
    session.itemData.reward = body;
  }

  session.step = ConversationStep.AWAITING_IMAGE;
  await client.sendMessage(chatId,
    `📸 *Send a photo of the item*, or type *skip* if you don't have one.`
  );
}

async function handleImage(client: Client, chatId: string, body: string, message: any, session: ConversationState) {
  if (body.toLowerCase() === 'skip') {
    session.step = ConversationStep.AWAITING_PRIVACY_NAME;
    await client.sendMessage(chatId,
      `🔒 *Privacy Settings*\n\n` +
      `Show your *name* publicly on the post?\n\n` +
      `*yes* — Your name is visible to everyone\n` +
      `*no* — Shows as "Verified Campus User"\n\n` +
      `Reply *yes* or *no*.`
    );
    return;
  }

  // Check if the message has media
  if (message.hasMedia) {
    try {
      const media = await message.downloadMedia();
      if (!media || !media.mimetype.startsWith('image/')) {
        await client.sendMessage(chatId, `❌ Please send an *image* file, or type *skip*.`);
        return;
      }

      await client.sendMessage(chatId, `⏳ Uploading image...`);
      const imageUrl = await uploadImageToCloudinary(media);
      session.itemData.imageUrl = imageUrl;

      session.step = ConversationStep.AWAITING_PRIVACY_NAME;
      await client.sendMessage(chatId,
        `✅ Image uploaded!\n\n` +
        `🔒 *Privacy Settings*\n\n` +
        `Show your *name* publicly on the post?\n\n` +
        `*yes* — Your name is visible to everyone\n` +
        `*no* — Shows as "Verified Campus User"\n\n` +
        `Reply *yes* or *no*.`
      );
    } catch (error) {
      console.error('Image upload failed:', error);
      await client.sendMessage(chatId,
        `❌ Image upload failed. Please try again or type *skip* to continue without an image.`
      );
    }
  } else {
    await client.sendMessage(chatId,
      `📸 Please *send a photo* or type *skip* to continue without one.`
    );
  }
}

async function handlePrivacyName(client: Client, chatId: string, body: string, session: ConversationState) {
  if (body === 'yes' || body === 'y') {
    session.itemData.showPosterName = true;
  } else if (body === 'no' || body === 'n') {
    session.itemData.showPosterName = false;
  } else {
    await client.sendMessage(chatId, `Please reply *yes* or *no*.`);
    return;
  }

  session.step = ConversationStep.AWAITING_PRIVACY_WHATSAPP;
  await client.sendMessage(chatId,
    `📱 Show your *WhatsApp number* publicly?\n\n` +
    `*yes* — Anyone can see your number\n` +
    `*no* — Hidden until you accept a claim\n\n` +
    `Reply *yes* or *no*.`
  );
}

async function handlePrivacyWhatsapp(client: Client, chatId: string, body: string, session: ConversationState) {
  if (body === 'yes' || body === 'y') {
    session.itemData.showPosterWhatsapp = true;
  } else if (body === 'no' || body === 'n') {
    session.itemData.showPosterWhatsapp = false;
  } else {
    await client.sendMessage(chatId, `Please reply *yes* or *no*.`);
    return;
  }

  // Show summary and ask for confirmation
  session.step = ConversationStep.AWAITING_CONFIRM;
  const d = session.itemData;
  const summary = [
    `📋 *Review Your Post*\n`,
    `*Type:* ${d.type}`,
    `*Title:* ${d.title}`,
    d.category ? `*Category:* ${d.category}` : null,
    d.color ? `*Color:* ${d.color}` : null,
    d.brand ? `*Brand:* ${d.brand}` : null,
    d.dateOccurred ? `*Date:* ${new Date(d.dateOccurred).toLocaleDateString('en-IN')}` : null,
    `*Description:* ${d.description}`,
    `*Location:* ${d.location}`,
    d.identifyingMarks ? `*Identifying Marks:* ${d.identifyingMarks}` : null,
    d.type === 'LOST' ? `*Urgency:* ${d.urgency}` : null,
    d.reward ? `*Reward:* ${d.reward}` : null,
    d.imageUrl ? `*Image:* ✅ Attached` : `*Image:* ❌ None`,
    `*Name visible:* ${d.showPosterName ? 'Yes' : 'No'}`,
    `*WhatsApp visible:* ${d.showPosterWhatsapp ? 'Yes' : 'No'}`,
    `\nReply *confirm* to post or *cancel* to discard.`,
  ].filter(Boolean).join('\n');

  await client.sendMessage(chatId, summary);
}

async function handleConfirm(client: Client, chatId: string, body: string, session: ConversationState) {
  if (body !== 'confirm') {
    if (body === 'cancel') {
      session.step = ConversationStep.VERIFIED_MENU;
      session.itemData = {};
      await client.sendMessage(chatId, `❌ Post discarded.\n\n` + getMenuMessage());
      return;
    }
    await client.sendMessage(chatId, `Reply *confirm* to post or *cancel* to discard.`);
    return;
  }

  const d = session.itemData;
  const userId = session.userId!;

  try {
    // Rate limit check (same as HTTP route — 5 items/hour)
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    const recentCount = await prisma.item.count({
      where: { userId, createdAt: { gte: oneHourAgo } },
    });
    if (recentCount >= 5) {
      await client.sendMessage(chatId,
        `⚠️ You've reached the limit of 5 items per hour. Please try again later.\n\n` + getMenuMessage()
      );
      session.step = ConversationStep.VERIFIED_MENU;
      session.itemData = {};
      return;
    }

    let storedImageUrl: string | null = null;
    if (d.imageUrl) {
      storedImageUrl = JSON.stringify([d.imageUrl]);
    }

    const newItem = await prisma.item.create({
      data: {
        userId,
        type: d.type!,
        title: d.title!,
        description: d.description!,
        location: d.location!,
        category: d.category || null,
        color: d.color || null,
        brand: d.brand || null,
        dateOccurred: d.dateOccurred ? new Date(d.dateOccurred) : null,
        identifyingMarks: d.identifyingMarks || null,
        imageUrl: storedImageUrl,
        showPosterName: d.showPosterName || false,
        showPosterWhatsapp: d.showPosterWhatsapp || false,
        urgency: d.urgency === 'URGENT' ? 'URGENT' : 'NORMAL',
        reward: d.reward || null,
      },
    });

    // Trigger matching algorithm
    await findAndStoreMatches(newItem);

    session.step = ConversationStep.VERIFIED_MENU;
    session.itemData = {};

    const typeEmoji = d.type === 'LOST' ? '🔴' : '🟢';
    await client.sendMessage(chatId,
      `✅ *Item posted successfully!* ${typeEmoji}\n\n` +
      `*"${d.title}"* has been added to the feed.\n` +
      `Our matching algorithm is now searching for potential matches.\n\n` +
      `📲 You'll receive a WhatsApp notification if we find a match!\n\n` +
      `🔗 *View your item and all posts:* ${WEBSITE_URL}\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      getMenuMessage()
    );
  } catch (error) {
    console.error('Failed to create item via WhatsApp:', error);
    await client.sendMessage(chatId,
      `❌ Failed to post item. Please try again.\n\nType *menu* to start over.`
    );
  }
}

// ─── Initialize WhatsApp Client ───────────────────────────
export function initWhatsAppBot() {
  console.log('🤖 Initializing WhatsApp Bot...');

  const client = new Client({
    authStrategy: new LocalAuth({
      dataPath: './whatsapp-session',
    }),
    puppeteer: {
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    },
  });

  client.on('qr', (qr: string) => {
    console.log('\n📱 Scan this QR code with your WhatsApp:');
    qrcode.generate(qr, { small: true });
    console.log('\nWaiting for scan...\n');
  });

  client.on('ready', async () => {
    console.log('✅ WhatsApp Bot is ready and connected!');
    setWhatsAppClient(client);

    try {
      // Set Display Name
      await client.setDisplayName('KGPFind');
      
      // Set Profile Picture
      const logoPath = require('path').join(process.cwd(), '../client/public/logo.png');
      const media = MessageMedia.fromFilePath(logoPath);
      await client.setProfilePicture(media);
      console.log('🖼️  Profile name and picture updated successfully.');
    } catch (error) {
      console.error('⚠️ Could not set profile info automatically:', error);
    }
  });

  client.on('authenticated', () => {
    console.log('🔐 WhatsApp Bot authenticated successfully.');
  });

  client.on('auth_failure', (msg: string) => {
    console.error('❌ WhatsApp authentication failed:', msg);
  });

  client.on('disconnected', (reason: string) => {
    console.log('📴 WhatsApp Bot disconnected:', reason);
    setWhatsAppClient(null);
  });

  client.on('message', async (message: any) => {
    try {
      // Only handle personal messages, not group messages
      if (message.from.endsWith('@g.us')) return;
      // Ignore status updates
      if (message.from === 'status@broadcast') return;

      await handleMessage(client, message.from, message.body || '', message);
    } catch (error) {
      console.error('Error handling WhatsApp message:', error);
      try {
        await client.sendMessage(message.from,
          `❌ Something went wrong. Please try again.\n\nType *menu* to go back to the main menu.`
        );
      } catch (e) {
        console.error('Failed to send error message:', e);
      }
    }
  });

  client.initialize();

  return client;
}
