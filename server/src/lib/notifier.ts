import prisma from './prisma';

// Reference to the WhatsApp client — set by whatsapp.ts after initialization
let whatsappClient: any = null;

export function setWhatsAppClient(client: any) {
  whatsappClient = client;
}

const WEBSITE_URL = process.env.WEBSITE_URL || 'https://kgp-lost-found.vercel.app';

/**
 * Send a WhatsApp notification to a user if they have a linked WhatsApp number.
 * Falls back silently if the client isn't ready or user has no number.
 */
export async function sendWhatsAppNotification(userId: string, title: string, message: string) {
  if (!whatsappClient) return;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { whatsappNumber: true },
    });

    if (!user?.whatsappNumber) return;

    // whatsapp-web.js expects the chatId format: countrycode + number + @c.us
    // Indian numbers: 91XXXXXXXXXX@c.us
    const chatId = `91${user.whatsappNumber}@c.us`;

    const formattedMessage = `🔔 *${title}*\n\n${message}\n\n🔗 View on website: ${WEBSITE_URL}`;

    await whatsappClient.sendMessage(chatId, formattedMessage);
    console.log(`[WhatsApp Notifier] Sent notification to ${user.whatsappNumber}`);
  } catch (error) {
    console.error(`[WhatsApp Notifier] Failed to send notification to user ${userId}:`, error);
    // Don't throw — notifications are best-effort
  }
}
