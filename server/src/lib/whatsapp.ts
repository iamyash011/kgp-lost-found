import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  downloadMediaMessage,
  getContentType,
  makeCacheableSignalKeyStore,
  proto,
  WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import prisma from './prisma';
import { sendOTP } from './email';
import { findAndStoreMatches } from './matching';
import { setBaileysSocket } from './notifier';
import { v2 as cloudinary } from 'cloudinary';
import { containsProfanity } from './moderation';
import { analyzeItemImage } from './vision';
import { Pool } from 'pg';

const WEBSITE_URL = process.env.WEBSITE_URL || 'https://kgp-lost-found.vercel.app';

const logger = pino({ level: 'silent' }); // Suppress Baileys' verbose logging

// ─── Conversation State Machine ───────────────────────────
enum ConversationStep {
  IDLE = 'IDLE',
  AWAITING_EMAIL = 'AWAITING_EMAIL',
  AWAITING_OTP = 'AWAITING_OTP',
  VERIFIED_MENU = 'VERIFIED_MENU',
  AWAITING_TYPE = 'AWAITING_TYPE',
  AWAITING_FOUND_MODE = 'AWAITING_FOUND_MODE',
  AWAITING_QUICK_IMAGE = 'AWAITING_QUICK_IMAGE',
  AWAITING_QUICK_LOCATION = 'AWAITING_QUICK_LOCATION',
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
  aiPromise?: Promise<void>;
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
  // chatId format: [country_code][number]@s.whatsapp.net
  // We should preserve the country code for sending notifications later
  return chatId.replace('@s.whatsapp.net', '');
}

function getTextFromMessage(message: proto.IMessage | null | undefined): string {
  if (!message) return '';
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    ''
  );
}

async function uploadBufferToCloudinary(buffer: Buffer): Promise<string> {
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
    uploadStream.end(buffer);
  });
}

// ─── Message Handler ──────────────────────────────────────
async function handleMessage(sock: WASocket, chatId: string, messageBody: string, message: proto.IWebMessageInfo) {
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
        await sock.sendMessage(chatId, { text: '❌ Item report cancelled.\n\n' + getMenuMessage() });
      } else {
        await sock.sendMessage(chatId, { text: getMenuMessage() });
      }
    } else {
      resetSession(chatId);
      await sock.sendMessage(chatId, { text: '❌ Cancelled. Send *hi* to start again.' });
    }
    return;
  }

  if (bodyLower === 'menu' && session.userId) {
    session.step = ConversationStep.VERIFIED_MENU;
    session.itemData = {};
    await sock.sendMessage(chatId, { text: getMenuMessage() });
    return;
  }

  // If the user is completely idle, only respond to specific trigger words
  // This prevents the bot from spamming normal conversations if it's hosted on a spare number
  if (session.step === ConversationStep.IDLE) {
    const triggers = ['hi', 'hello', 'start', 'bot', 'menu', 'help'];
    if (!triggers.includes(bodyLower)) {
      return; // Silently ignore random texts like "what's up"
    }
  }

  // Route based on current step
  switch (session.step) {
    case ConversationStep.IDLE:
      await handleIdle(sock, chatId, session);
      break;
    case ConversationStep.AWAITING_EMAIL:
      await handleEmail(sock, chatId, body, session);
      break;
    case ConversationStep.AWAITING_OTP:
      await handleOTPVerification(sock, chatId, body, session);
      break;
    case ConversationStep.VERIFIED_MENU:
      await handleMenu(sock, chatId, bodyLower, session);
      break;
    case ConversationStep.AWAITING_TYPE:
      await handleType(sock, chatId, bodyLower, session);
      break;
    case ConversationStep.AWAITING_FOUND_MODE:
      await handleFoundMode(sock, chatId, bodyLower, session);
      break;
    case ConversationStep.AWAITING_QUICK_IMAGE:
      await handleQuickImage(sock, chatId, body, message, session);
      break;
    case ConversationStep.AWAITING_QUICK_LOCATION:
      await handleQuickLocation(sock, chatId, body, session);
      break;
    case ConversationStep.AWAITING_TITLE:
      await handleTitle(sock, chatId, body, session);
      break;
    case ConversationStep.AWAITING_CATEGORY:
      await handleCategory(sock, chatId, body, session);
      break;
    case ConversationStep.AWAITING_COLOR:
      await handleColor(sock, chatId, body, session);
      break;
    case ConversationStep.AWAITING_BRAND:
      await handleBrand(sock, chatId, body, session);
      break;
    case ConversationStep.AWAITING_DATE:
      await handleDate(sock, chatId, body, session);
      break;
    case ConversationStep.AWAITING_DESCRIPTION:
      await handleDescription(sock, chatId, body, session);
      break;
    case ConversationStep.AWAITING_LOCATION:
      await handleLocation(sock, chatId, body, session);
      break;
    case ConversationStep.AWAITING_IDENTIFYING_MARKS:
      await handleIdentifyingMarks(sock, chatId, body, session);
      break;
    case ConversationStep.AWAITING_URGENCY:
      await handleUrgency(sock, chatId, bodyLower, session);
      break;
    case ConversationStep.AWAITING_REWARD:
      await handleReward(sock, chatId, body, session);
      break;
    case ConversationStep.AWAITING_IMAGE:
      await handleImage(sock, chatId, body, message, session);
      break;
    case ConversationStep.AWAITING_PRIVACY_NAME:
      await handlePrivacySettings(sock, chatId, bodyLower, session);
      break;
    case ConversationStep.AWAITING_CONFIRM:
      await handleConfirm(sock, chatId, bodyLower, session);
      break;
  }
}

// ─── Step Handlers ────────────────────────────────────────

function getMenuMessage(): string {
  return `📋 *KGP Lost & Found — Menu*\n\nWhat would you like to do?\n\n*1.* Report a Lost item\n*2.* Report a Found item\n*3.* View all items on website\n*4.* View my potential matches\n\nReply with *1*, *2*, *3*, or *4*.\n\n🔗 ${WEBSITE_URL}`;
}

async function handleIdle(sock: WASocket, chatId: string, session: ConversationState) {
  // Check if this WhatsApp number is already linked to a user
  const phoneNumber = extractWhatsAppNumber(chatId);
  const existingUser = await prisma.user.findFirst({
    where: { whatsappNumber: phoneNumber },
  });

  if (existingUser) {
    session.userId = existingUser.id;
    session.email = existingUser.email;
    session.step = ConversationStep.VERIFIED_MENU;
    await sock.sendMessage(chatId, {
      text: `👋 Welcome back, *${existingUser.name}*!\n\n` + getMenuMessage()
    });
    return;
  }

  session.step = ConversationStep.AWAITING_EMAIL;
  await sock.sendMessage(chatId, {
    text: `👋 *Welcome to KGP Lost & Found!* 🏛️\n\n` +
      `Here’s how this bot makes your life easier:\n` +
      `📸 *AI Vision:* Found something? Just snap a photo! Our AI automatically identifies the item.\n` +
      `🤝 *Smart Matching:* We automatically match lost and found items and alert you instantly.\n` +
      `💬 *Instant Connect:* Claim items and connect with the owner directly via WhatsApp.\n\n` +
      `First, let's verify your identity.\n` +
      `Please enter your *IIT KGP email address*:\n` +
      `(e.g. yourname@iitkgp.ac.in)\n\n` +
      `🔗 Visit our website: ${WEBSITE_URL}`
  });
}

async function handleEmail(sock: WASocket, chatId: string, body: string, session: ConversationState) {
  const email = body.toLowerCase().trim();

  // Validate IIT KGP email
  if (!email.endsWith('iitkgp.ac.in') && email !== 'kgp.lost.found@gmail.com') {
    await sock.sendMessage(chatId, {
      text: `❌ Only *IIT KGP email addresses* are allowed.\n\nPlease enter a valid email ending with *@iitkgp.ac.in*`
    });
    return;
  }

  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    await sock.sendMessage(chatId, { text: `❌ That doesn't look like a valid email. Please try again.` });
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
    await sock.sendMessage(chatId, {
      text: `📧 A *6-digit OTP* has been sent to *${email}*.\n\n` +
        `Please check your inbox (and spam folder) and reply with the code.\n\n` +
        `⏳ OTP expires in 5 minutes.`
    });
  } catch (error) {
    console.error('Failed to send OTP:', error);
    await sock.sendMessage(chatId, {
      text: `❌ Failed to send OTP. Please try again later or contact admin.\n\nType *cancel* to start over.`
    });
  }
}

async function handleOTPVerification(sock: WASocket, chatId: string, body: string, session: ConversationState) {
  if (!session.otp || !session.otpExpiry) {
    session.step = ConversationStep.AWAITING_EMAIL;
    await sock.sendMessage(chatId, { text: `❌ Session expired. Please enter your email again.` });
    return;
  }

  if (Date.now() > session.otpExpiry) {
    session.otp = undefined;
    session.otpExpiry = undefined;
    session.step = ConversationStep.AWAITING_EMAIL;
    await sock.sendMessage(chatId, { text: `⏰ OTP expired! Please enter your email again to get a new one.` });
    return;
  }

  if (body.trim() !== session.otp) {
    await sock.sendMessage(chatId, { text: `❌ Incorrect OTP. Please try again or type *cancel* to start over.` });
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

    await sock.sendMessage(chatId, {
      text: `✅ *Verified successfully!*\n\n` +
        `Welcome, *${user.name}*! Your WhatsApp is now linked to your KGP Lost & Found account.\n\n` +
        getMenuMessage()
    });
  } catch (error) {
    console.error('Failed to link user:', error);
    await sock.sendMessage(chatId, {
      text: `❌ Something went wrong. Please try again.\n\nType *cancel* to start over.`
    });
  }
}

async function handleMenu(sock: WASocket, chatId: string, body: string, session: ConversationState) {
  switch (body) {
    case '1':
      session.itemData = { type: 'LOST' };
      session.step = ConversationStep.AWAITING_TITLE;
      await sock.sendMessage(chatId, {
        text: `📝 *Reporting a LOST item*\n\n` +
          `What is the item?\n` +
          `(e.g. Milton Water Bottle, ID Card, JBL Earbuds)`
      });
      break;
    case '2':
      session.itemData = { type: 'FOUND' };
      session.step = ConversationStep.AWAITING_FOUND_MODE;
      await sock.sendMessage(chatId, {
        text: `📝 *Reporting a FOUND item*\n\n` +
          `Choose your reporting mode:\n\n` +
          `*1.* ⚡ Quick Mode (Just send a photo & location. AI fills the rest)\n` +
          `*2.* 📝 Detailed Mode (Manual questions)\n\n` +
          `Reply with *1* or *2*.`
      });
      break;
    case '3':
      await sock.sendMessage(chatId, {
        text: `🔗 *View all items on our website:*\n\n${WEBSITE_URL}\n\n` +
          `Type *menu* to go back.`
      });
      break;
    case '4':
      await handleViewMatches(sock, chatId, session);
      break;
    default:
      await sock.sendMessage(chatId, { text: `Please reply with *1*, *2*, *3*, or *4*.\n\n` + getMenuMessage() });
  }
}

async function handleViewMatches(sock: WASocket, chatId: string, session: ConversationState) {
  if (!session.userId) return;

  try {
    // Find all matches for this user's items
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { lostItem: { userId: session.userId } },
          { foundItem: { userId: session.userId } }
        ]
      },
      include: {
        lostItem: {
          include: { user: true }
        },
        foundItem: {
          include: { user: true }
        }
      },
      orderBy: { matchScore: 'desc' },
      take: 5
    });

    if (matches.length === 0) {
      await sock.sendMessage(chatId, {
        text: `🔍 *No matches found yet.*\n\n` +
          `We will notify you automatically if a potential match is found for your items!\n\n` +
          `Type *menu* to go back.`
      });
      return;
    }

    let response = `🔍 *Your Top 5 Potential Matches:*\n\n`;
    
    matches.forEach((match, idx) => {
      // Determine which one is the user's item
      const myItem = match.lostItem.userId === session.userId ? match.lostItem : match.foundItem;
      const otherItem = match.lostItem.userId === session.userId ? match.foundItem : match.lostItem;
      
      const scorePercentage = Math.round(match.matchScore * 100);
      
      response += `*${idx + 1}.* Your ${myItem.type === 'LOST' ? 'lost' : 'found'} *${myItem.title}* may match a ${otherItem.type === 'LOST' ? 'lost' : 'found'} *${otherItem.title}* near *${otherItem.location}*.\n`;
      response += `   *Match Score:* ${scorePercentage}%\n`;

      if (otherItem.showPosterWhatsapp && otherItem.user?.whatsappNumber) {
        // If it's a 10-digit number, prepend 91 for the wa.me link
        const num = otherItem.user.whatsappNumber.length === 10 ? `91${otherItem.user.whatsappNumber}` : otherItem.user.whatsappNumber;
        response += `   📞 *Contact:* https://wa.me/${num}\n\n`;
      } else {
        response += `   🔒 *Contact:* Hidden (Claim on website to chat)\n\n`;
      }
    });

    response += `🔗 View details and claim items on the website: ${WEBSITE_URL}\n\nType *menu* to go back.`;

    await sock.sendMessage(chatId, { text: response });
  } catch (error) {
    console.error('Failed to fetch matches:', error);
    await sock.sendMessage(chatId, { text: `❌ Failed to fetch matches. Please try again later.\n\nType *menu* to go back.` });
  }
}

async function handleType(sock: WASocket, chatId: string, body: string, session: ConversationState) {
  // This is a fallback if someone reaches AWAITING_TYPE directly
  if (body === '1' || body === 'lost') {
    session.itemData.type = 'LOST';
  } else if (body === '2' || body === 'found') {
    session.itemData.type = 'FOUND';
  } else {
    await sock.sendMessage(chatId, { text: `Please reply with *1* for LOST or *2* for FOUND.` });
    return;
  }
  session.step = ConversationStep.AWAITING_TITLE;
  await sock.sendMessage(chatId, {
    text: `What is the item?\n(e.g. Milton Water Bottle, ID Card, JBL Earbuds)`
  });
}

async function handleFoundMode(sock: WASocket, chatId: string, body: string, session: ConversationState) {
  if (body === '1' || body === 'quick') {
    session.step = ConversationStep.AWAITING_QUICK_IMAGE;
    await sock.sendMessage(chatId, {
      text: `📸 *Send a photo of the item you found.*\n\nOur AI will automatically scan it to determine what it is!`
    });
  } else if (body === '2' || body === 'detailed') {
    session.step = ConversationStep.AWAITING_TITLE;
    await sock.sendMessage(chatId, {
      text: `What is the item?\n(e.g. Milton Water Bottle, ID Card, JBL Earbuds)`
    });
  } else {
    await sock.sendMessage(chatId, { text: `Please reply with *1* for Quick Mode or *2* for Detailed Mode.` });
  }
}

async function handleQuickImage(sock: WASocket, chatId: string, body: string, message: proto.IWebMessageInfo, session: ConversationState) {
  const messageType = message.message ? getContentType(message.message) : null;
  
  if (messageType === 'imageMessage') {
    try {
      // 1. Download buffer immediately
      const buffer = await downloadMediaMessage(
        message as any,
        'buffer',
        {},
        { logger: logger as any, reuploadRequest: sock.updateMediaMessage }
      );
      const mimeType = message.message?.imageMessage?.mimetype || 'image/jpeg';

      // 2. Acknowledge image and ask for location instantly (Zero Friction)
      session.step = ConversationStep.AWAITING_QUICK_LOCATION;
      // Default missing properties for FOUND
      session.itemData.urgency = 'NORMAL';
      
      await sock.sendMessage(chatId, {
        text: `📸 *Got it! Our AI is analyzing the image in the background.*\n\n` +
          `📍 *Where did you find it?*\n(e.g. Nalanda Classroom Complex, Tech Market)`
      });

      // 3. Fire off the AI Vision task asynchronously
      session.aiPromise = (async () => {
        try {
          const aiResponse = await analyzeItemImage(buffer as Buffer, mimeType);
          const imageUrl = await uploadBufferToCloudinary(buffer as Buffer);
          
          session.itemData.imageUrl = imageUrl;
          
          if (aiResponse.result) {
            session.itemData.title = aiResponse.result.title;
            session.itemData.category = aiResponse.result.category;
            session.itemData.color = aiResponse.result.color;
            session.itemData.brand = aiResponse.result.brand;
            session.itemData.description = `Found item. Automatically categorized by AI based on image.`;
          } else {
            // Fallback
            session.itemData.title = 'Found Item';
            session.itemData.description = `Found item. (AI skipped: ${aiResponse.error})`;
          }
        } catch (err) {
          console.error('Async AI Vision Error:', err);
          session.itemData.title = 'Found Item';
          session.itemData.description = 'Found item.';
        }
      })();
      
    } catch (error) {
      console.error('AI Quick Flow Error:', error);
      await sock.sendMessage(chatId, { text: `❌ Failed to process the image. Please try again or type *cancel*.` });
    }
  } else {
    await sock.sendMessage(chatId, { text: `📸 Please send an *image* of the item to continue.` });
  }
}

async function handleQuickLocation(sock: WASocket, chatId: string, body: string, session: ConversationState) {
  if (body.length < 2) {
    await sock.sendMessage(chatId, { text: `Please provide a location (at least 2 characters).` });
    return;
  }
  session.itemData.location = body;
  
  session.step = ConversationStep.AWAITING_PRIVACY_NAME;
  await sock.sendMessage(chatId, {
    text: `🔒 *Privacy Settings*\n\n` +
      `Show your Name and WhatsApp number publicly on the post?\n\n` +
      `*1.* Hide both (Private)\n` +
      `*2.* Show Name only\n` +
      `*3.* Show WhatsApp only\n` +
      `*4.* Show both (Public)\n\n` +
      `Reply with *1*, *2*, *3*, or *4*.`
  });
}

async function handleTitle(sock: WASocket, chatId: string, body: string, session: ConversationState) {
  if (body.length < 2) {
    await sock.sendMessage(chatId, { text: `Please provide a more descriptive title (at least 2 characters).` });
    return;
  }
  if (containsProfanity([body])) {
    await sock.sendMessage(chatId, { text: `❌ Title contains inappropriate language. Please try again.` });
    return;
  }
  session.itemData.title = body;
  session.step = ConversationStep.AWAITING_CATEGORY;

  const categoryList = CATEGORIES.map((c, i) => `*${i + 1}.* ${c}`).join('\n');
  await sock.sendMessage(chatId, {
    text: `📂 *Select a category:*\n\n${categoryList}\n\nReply with the *number* or type *skip*.`
  });
}

async function handleCategory(sock: WASocket, chatId: string, body: string, session: ConversationState) {
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
        await sock.sendMessage(chatId, {
          text: `Please reply with a number (1-${CATEGORIES.length}) or type *skip*.`
        });
        return;
      }
    }
  }

  session.step = ConversationStep.AWAITING_COLOR;
  const colorList = COLORS.map((c, i) => `*${i + 1}.* ${c}`).join('\n');
  await sock.sendMessage(chatId, {
    text: `🎨 *Select a color:*\n\n${colorList}\n\nReply with the *number* or type *skip*.`
  });
}

async function handleColor(sock: WASocket, chatId: string, body: string, session: ConversationState) {
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
        await sock.sendMessage(chatId, {
          text: `Please reply with a number (1-${COLORS.length}) or type *skip*.`
        });
        return;
      }
    }
  }

  session.step = ConversationStep.AWAITING_BRAND;
  await sock.sendMessage(chatId, {
    text: `🏷️ *Brand?*\n(e.g. JBL, Samsung, Milton, Apple)\n\nType the brand name or *skip*.`
  });
}

async function handleBrand(sock: WASocket, chatId: string, body: string, session: ConversationState) {
  if (body.toLowerCase() !== 'skip') {
    session.itemData.brand = body;
  }

  session.step = ConversationStep.AWAITING_DATE;
  const typeWord = session.itemData.type === 'LOST' ? 'lose' : 'find';
  await sock.sendMessage(chatId, {
    text: `📅 *When did you ${typeWord} it?*\n\n` +
      `Reply in format: *DD/MM/YYYY*\n` +
      `(e.g. 23/06/2026)\n\nOr type *skip*.`
  });
}

async function handleDate(sock: WASocket, chatId: string, body: string, session: ConversationState) {
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
        await sock.sendMessage(chatId, { text: `❌ Date cannot be in the future. Please try again or type *skip*.` });
        return;
      }
      
      session.itemData.dateOccurred = date.toISOString();
    } else {
      await sock.sendMessage(chatId, {
        text: `❌ Invalid date format. Please use *DD/MM/YYYY* (e.g. 23/06/2026) or type *skip*.`
      });
      return;
    }
  }

  session.step = ConversationStep.AWAITING_DESCRIPTION;
  await sock.sendMessage(chatId, {
    text: `📝 *Describe the item in detail:*\n\n` +
      `Include scratches, stickers, unique features, any details that help identify it.`
  });
}

async function handleDescription(sock: WASocket, chatId: string, body: string, session: ConversationState) {
  if (body.length < 5) {
    await sock.sendMessage(chatId, { text: `Please provide a more detailed description (at least 5 characters).` });
    return;
  }
  if (containsProfanity([body])) {
    await sock.sendMessage(chatId, { text: `❌ Description contains inappropriate language. Please try again.` });
    return;
  }
  session.itemData.description = body;
  session.step = ConversationStep.AWAITING_LOCATION;

  const typeWord = session.itemData.type === 'LOST' ? 'lost' : 'found';
  await sock.sendMessage(chatId, {
    text: `📍 *Where was it ${typeWord}?*\n\n` +
      `(e.g. Nalanda Classroom Complex, LBS Hall, Tech Market, Main Building)`
  });
}

async function handleLocation(sock: WASocket, chatId: string, body: string, session: ConversationState) {
  if (body.length < 2) {
    await sock.sendMessage(chatId, { text: `Please provide a location (at least 2 characters).` });
    return;
  }
  session.itemData.location = body;
  session.step = ConversationStep.AWAITING_IDENTIFYING_MARKS;
  await sock.sendMessage(chatId, {
    text: `🔍 *Any identifying marks?*\n\n` +
      `(e.g. scratch on base, red tape, name written on it)\n\nOr type *skip*.`
  });
}

async function handleIdentifyingMarks(sock: WASocket, chatId: string, body: string, session: ConversationState) {
  if (body.toLowerCase() !== 'skip') {
    session.itemData.identifyingMarks = body;
  }

  // If LOST, ask urgency; otherwise skip to image
  if (session.itemData.type === 'LOST') {
    session.step = ConversationStep.AWAITING_URGENCY;
    await sock.sendMessage(chatId, {
      text: `⚡ *Urgency level?*\n\n*1.* Normal\n*2.* 🔥 Urgent\n\nReply with *1* or *2*.`
    });
  } else {
    session.itemData.urgency = 'NORMAL';
    session.step = ConversationStep.AWAITING_IMAGE;
    await sock.sendMessage(chatId, {
      text: `📸 *Send a photo of the item*, or type *skip* if you don't have one.`
    });
  }
}

async function handleUrgency(sock: WASocket, chatId: string, body: string, session: ConversationState) {
  if (body === '1' || body === 'normal') {
    session.itemData.urgency = 'NORMAL';
  } else if (body === '2' || body === 'urgent') {
    session.itemData.urgency = 'URGENT';
  } else {
    await sock.sendMessage(chatId, { text: `Please reply *1* for Normal or *2* for Urgent.` });
    return;
  }

  session.step = ConversationStep.AWAITING_REWARD;
  await sock.sendMessage(chatId, {
    text: `💰 *Any reward for the finder?*\n\n(e.g. ₹500 reward)\n\nOr type *skip*.`
  });
}

async function handleReward(sock: WASocket, chatId: string, body: string, session: ConversationState) {
  if (body.toLowerCase() !== 'skip') {
    session.itemData.reward = body;
  }

  session.step = ConversationStep.AWAITING_IMAGE;
  await sock.sendMessage(chatId, {
    text: `📸 *Send a photo of the item*, or type *skip* if you don't have one.`
  });
}

async function handleImage(sock: WASocket, chatId: string, body: string, message: proto.IWebMessageInfo, session: ConversationState) {
  if (body.toLowerCase() === 'skip') {
    session.step = ConversationStep.AWAITING_PRIVACY_NAME;
    await sock.sendMessage(chatId, {
      text: `🔒 *Privacy Settings*\n\n` +
        `Show your Name and WhatsApp number publicly on the post?\n\n` +
        `*1.* Hide both (Private)\n` +
        `*2.* Show Name only\n` +
        `*3.* Show WhatsApp only\n` +
        `*4.* Show both (Public)\n\n` +
        `Reply with *1*, *2*, *3*, or *4*.`
    });
    return;
  }

  // Check if the message has an image
  const messageType = message.message ? getContentType(message.message) : null;
  if (messageType === 'imageMessage') {
    try {
      const buffer = await downloadMediaMessage(
        message as any,
        'buffer',
        {},
        {
          logger: logger as any,
          reuploadRequest: sock.updateMediaMessage,
        }
      );

      await sock.sendMessage(chatId, { text: `⏳ Uploading image...` });
      const imageUrl = await uploadBufferToCloudinary(buffer as Buffer);
      session.itemData.imageUrl = imageUrl;

      session.step = ConversationStep.AWAITING_PRIVACY_NAME;
      await sock.sendMessage(chatId, {
        text: `✅ Image uploaded!\n\n` +
          `🔒 *Privacy Settings*\n\n` +
          `Show your Name and WhatsApp number publicly on the post?\n\n` +
          `*1.* Hide both (Private)\n` +
          `*2.* Show Name only\n` +
          `*3.* Show WhatsApp only\n` +
          `*4.* Show both (Public)\n\n` +
          `Reply with *1*, *2*, *3*, or *4*.`
      });
    } catch (error) {
      console.error('Image upload failed:', error);
      await sock.sendMessage(chatId, {
        text: `❌ Image upload failed. Please try again or type *skip* to continue without an image.`
      });
    }
  } else {
    await sock.sendMessage(chatId, {
      text: `📸 Please *send a photo* or type *skip* to continue without one.`
    });
  }
}

async function handlePrivacySettings(sock: WASocket, chatId: string, body: string, session: ConversationState) {
  if (body === '1') {
    session.itemData.showPosterName = false;
    session.itemData.showPosterWhatsapp = false;
  } else if (body === '2') {
    session.itemData.showPosterName = true;
    session.itemData.showPosterWhatsapp = false;
  } else if (body === '3') {
    session.itemData.showPosterName = false;
    session.itemData.showPosterWhatsapp = true;
  } else if (body === '4') {
    session.itemData.showPosterName = true;
    session.itemData.showPosterWhatsapp = true;
  } else {
    await sock.sendMessage(chatId, { text: `Please reply with *1*, *2*, *3*, or *4*.` });
    return;
  }

  // If there's a pending AI background task, wait for it to finish before showing the summary
  if (session.aiPromise) {
    await sock.sendMessage(chatId, { text: `⏳ Finalizing AI analysis...` });
    try {
      await session.aiPromise;
    } catch (e) {
      console.error('Failed to await aiPromise', e);
    }
    // Clear it so we don't await it again
    session.aiPromise = undefined;
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

  await sock.sendMessage(chatId, { text: summary });
}

async function handleConfirm(sock: WASocket, chatId: string, body: string, session: ConversationState) {
  if (body !== 'confirm') {
    if (body === 'cancel') {
      session.step = ConversationStep.VERIFIED_MENU;
      session.itemData = {};
      await sock.sendMessage(chatId, { text: `❌ Post discarded.\n\n` + getMenuMessage() });
      return;
    }
    await sock.sendMessage(chatId, { text: `Reply *confirm* to post or *cancel* to discard.` });
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
      await sock.sendMessage(chatId, {
        text: `⚠️ You've reached the limit of 5 items per hour. Please try again later.\n\n` + getMenuMessage()
      });
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
    await sock.sendMessage(chatId, {
      text: `✅ *Item posted successfully!* ${typeEmoji}\n\n` +
        `*"${d.title}"* has been added to the feed.\n` +
        `Our matching algorithm is now searching for potential matches.\n\n` +
        `📲 You'll receive a WhatsApp notification if we find a match!\n\n` +
        `🔗 *View your item and all posts:* ${WEBSITE_URL}\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        getMenuMessage()
    });
  } catch (error) {
    console.error('Failed to create item via WhatsApp:', error);
    await sock.sendMessage(chatId, {
      text: `❌ Failed to post item. Please try again.\n\nType *menu* to start over.`
    });
  }
}

// ─── PostgreSQL Auth State (for Render deployment) ────────
async function usePostgresAuthState(pool: Pool, sessionId: string) {
  const tableName = 'baileys_auth';

  // Create table if it doesn't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${tableName} (
      session_id TEXT NOT NULL,
      data_key TEXT NOT NULL,
      data_value TEXT NOT NULL,
      PRIMARY KEY (session_id, data_key)
    )
  `);

  // Recursively convert {type:'Buffer', data:[...]} back to real Buffer instances
  const bufferifyValue = (value: any): any => {
    if (value === null || value === undefined) return value;
    if (typeof value === 'object' && value.type === 'Buffer' && Array.isArray(value.data)) {
      return Buffer.from(value.data);
    }
    if (Array.isArray(value)) {
      return value.map(bufferifyValue);
    }
    if (typeof value === 'object') {
      const result: Record<string, any> = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = bufferifyValue(v);
      }
      return result;
    }
    return value;
  };

  const readData = async (key: string): Promise<any> => {
    const result = await pool.query(
      `SELECT data_value FROM ${tableName} WHERE session_id = $1 AND data_key = $2`,
      [sessionId, key]
    );
    if (result.rows.length > 0) {
      return bufferifyValue(JSON.parse(result.rows[0].data_value));
    }
    return null;
  };

  const writeData = async (key: string, data: any) => {
    const value = JSON.stringify(data);
    await pool.query(
      `INSERT INTO ${tableName} (session_id, data_key, data_value)
       VALUES ($1, $2, $3)
       ON CONFLICT (session_id, data_key) DO UPDATE SET data_value = $3`,
      [sessionId, key, value]
    );
  };

  const removeData = async (key: string) => {
    await pool.query(
      `DELETE FROM ${tableName} WHERE session_id = $1 AND data_key = $2`,
      [sessionId, key]
    );
  };

  // Load creds
  const initialCreds = await readData('creds');

  const authState = {
    state: {
      creds: initialCreds || (await import('@whiskeysockets/baileys')).initAuthCreds(),
      keys: {
        get: async (type: string, ids: string[]) => {
          const result: Record<string, any> = {};
          for (const id of ids) {
            const data = await readData(`keys-${type}-${id}`);
            if (data) {
              result[id] = data;
            }
          }
          return result;
        },
        set: async (data: Record<string, Record<string, any>>) => {
          for (const [type, entries] of Object.entries(data)) {
            for (const [id, value] of Object.entries(entries)) {
              if (value) {
                await writeData(`keys-${type}-${id}`, value);
              } else {
                await removeData(`keys-${type}-${id}`);
              }
            }
          }
        },
      },
    },
    saveCreds: async () => {
      // Always save the CURRENT creds from the live state object
      await writeData('creds', authState.state.creds);
      console.log('💾 Credentials saved to PostgreSQL.');
    },
  };

  return authState;
}

// ─── Initialize WhatsApp Bot ──────────────────────────────
export async function initWhatsAppBot() {
  console.log('🤖 Initializing WhatsApp Bot (Baileys)...');

  let state: any;
  let saveCreds: () => Promise<void>;

  // Use PostgreSQL for auth state if DATABASE_URL is set (production/Render)
  if (process.env.DATABASE_URL) {
    console.log('⏳ Using PostgreSQL for session storage...');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
    });
    await pool.query('SELECT 1');
    console.log('✅ Connected to PostgreSQL for session storage.');

    const authState = await usePostgresAuthState(pool, 'kgpfind-bot');
    state = authState.state;
    saveCreds = authState.saveCreds;
  } else {
    // Use local file auth state for development
    console.log('📁 Using local file auth state (dev mode)...');
    const authState = await useMultiFileAuthState('./auth_info_baileys');
    state = authState.state;
    saveCreds = authState.saveCreds;
  }

  const startSocket = async () => {
    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger as any),
      },
      printQRInTerminal: true,
      logger: logger as any,
      browser: ['KGPFind', 'Chrome', '1.0.0'],
    });

    // Save credentials whenever they update
    sock.ev.on('creds.update', async () => {
      state.creds = sock.authState.creds;
      await saveCreds();
      console.log('🔑 Auth credentials updated and saved.');
    });

    // Handle connection updates
    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        // Also provide a clickable URL for cloud environments where terminal QR may break
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`;
        console.log('\n⚠️ If the QR code above is broken/unscannable, click this link to view it:');
        console.log(qrUrl);
        console.log('\nWaiting for scan...\n');
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(`📴 Connection closed. Status: ${statusCode}. Reconnecting: ${shouldReconnect}`);

        if (shouldReconnect) {
          // Reconnect after a short delay
          setTimeout(() => startSocket(), 3000);
        } else {
          console.log('❌ Logged out. Please delete auth_info_baileys and restart to re-scan.');
          setBaileysSocket(null);
        }
      }

      if (connection === 'open') {
        console.log('✅ WhatsApp Bot is ready and connected!');
        setBaileysSocket(sock);
      }
    });

    // Handle incoming messages
    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        try {
          // Skip messages from self
          if (msg.key.fromMe) continue;
          // Skip group messages
          if (msg.key.remoteJid?.endsWith('@g.us')) continue;
          // Skip status broadcasts
          if (msg.key.remoteJid === 'status@broadcast') continue;

          const chatId = msg.key.remoteJid!;
          const text = getTextFromMessage(msg.message);

          await handleMessage(sock, chatId, text, msg);
        } catch (error) {
          console.error('Error handling WhatsApp message:', error);
          try {
            if (msg.key.remoteJid) {
              await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Something went wrong. Please try again.\n\nType *menu* to go back to the main menu.`
              });
            }
          } catch (e) {
            console.error('Failed to send error message:', e);
          }
        }
      }
    });

    return sock;
  };

  return startSocket();
}
