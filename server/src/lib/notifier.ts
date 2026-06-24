import prisma from './prisma';

// Reference to the Baileys socket — set by whatsapp.ts after initialization
let baileysSocket: any = null;

export function setBaileysSocket(sock: any) {
  baileysSocket = sock;
}

// Legacy alias for compatibility
export function setWhatsAppClient(client: any) {
  baileysSocket = client;
}

const WEBSITE_URL = process.env.WEBSITE_URL || 'https://kgp-lost-found.vercel.app';

/**
 * Send a WhatsApp notification to a user if they have a linked WhatsApp number.
 * Falls back silently if the socket isn't ready or user has no number.
 */
export async function sendWhatsAppNotification(userId: string, title: string, message: string) {
  if (!baileysSocket) return;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { whatsappNumber: true },
    });

    if (!user?.whatsappNumber) return;

    // Baileys expects the chatId format: countrycode + number + @s.whatsapp.net
    // If it's exactly 10 digits, it's a legacy Indian number from before we saved country codes
    const number = user.whatsappNumber.length === 10 ? `91${user.whatsappNumber}` : user.whatsappNumber;
    const chatId = `${number}@s.whatsapp.net`;

    const formattedMessage = `🔔 *${title}*\n\n${message}\n\n🔗 View on website: ${WEBSITE_URL}`;

    await baileysSocket.sendMessage(chatId, { text: formattedMessage });
    console.log(`[WhatsApp Notifier] Sent notification to ${user.whatsappNumber}`);
  } catch (error) {
    console.error(`[WhatsApp Notifier] Failed to send notification to user ${userId}:`, error);
    // Don't throw — notifications are best-effort
  }
}
