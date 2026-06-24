import prisma from './prisma';
import { getStandardLocation } from './locations';
import { sendWhatsAppNotification } from './notifier';

// ═══════════════════════════════════════════════════════
// Multi-factor matching algorithm (shared by HTTP + WhatsApp bot)
// ═══════════════════════════════════════════════════════

export interface MatchableItem {
  id: string;
  type: string;
  title: string;
  description: string;
  location: string;
  category: string | null;
  color: string | null;
  brand: string | null;
  dateOccurred: Date | null;
  userId: string;
}

export async function findAndStoreMatches(newItem: MatchableItem) {
  const oppositeType = newItem.type === 'LOST' ? 'FOUND' : 'LOST';

  const candidates = await prisma.item.findMany({
    where: { type: oppositeType as any, status: 'ACTIVE' },
    include: { user: { select: { id: true } } },
  });

  const newKeywords = extractKeywords(newItem.title + ' ' + newItem.description);
  const newStandardLoc = getStandardLocation(newItem.location);

  for (const candidate of candidates) {
    let score = 0;

    // 1. Category match (+0.3)
    if (newItem.category && candidate.category &&
        newItem.category !== 'Other' &&
        newItem.category.toLowerCase() === candidate.category.toLowerCase()) {
      score += 0.3;
    }

    // 2. Keyword overlap (up to +0.3)
    const candidateKeywords = extractKeywords(candidate.title + ' ' + candidate.description);
    const commonWords = newKeywords.filter(w => candidateKeywords.includes(w));
    const keywordScore = commonWords.length / Math.max(newKeywords.length, 1);
    score += Math.min(keywordScore, 1) * 0.3;

    // 3. Location match (+0.2)
    const candidateStandardLoc = getStandardLocation(candidate.location);
    if (newStandardLoc && candidateStandardLoc && newStandardLoc === candidateStandardLoc) {
      score += 0.2;
    }

    // 4. Color match (+0.1)
    if (newItem.color && candidate.color &&
        newItem.color.toLowerCase() === candidate.color.toLowerCase()) {
      score += 0.1;
    }

    // 5. Brand match (+0.1)
    if (newItem.brand && candidate.brand &&
        newItem.brand.toLowerCase() === candidate.brand.toLowerCase()) {
      score += 0.1;
    }

    // 6. Date proximity — within 3 days (+0.1)
    if (newItem.dateOccurred && candidate.dateOccurred) {
      const daysDiff = Math.abs(
        (newItem.dateOccurred.getTime() - candidate.dateOccurred.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff <= 3) {
        score += 0.1;
      }
    }

    // Minimum threshold to create a match (0.4 means it requires at least Category + Location/Color/Brand, or Keyword matches)
    if (score >= 0.4) {
      const lostItemId = newItem.type === 'LOST' ? newItem.id : candidate.id;
      const foundItemId = newItem.type === 'FOUND' ? newItem.id : candidate.id;

      // Avoid duplicate matches
      const existing = await prisma.match.findFirst({ where: { lostItemId, foundItemId } });
      if (!existing) {
        const match = await prisma.match.create({
          data: { lostItemId, foundItemId, matchScore: Math.min(score, 1.0) },
        });

        // Notify both users about the match
        const lostItem = newItem.type === 'LOST' ? newItem : candidate;
        const foundItem = newItem.type === 'FOUND' ? newItem : candidate;

        // Notify the lost item's owner
        const lostMatchMsg = `A found "${foundItem.title}" near ${foundItem.location} could match your lost "${lostItem.title}".`;
        await prisma.notification.create({
          data: {
            userId: lostItem.userId,
            type: 'MATCH',
            title: 'Potential Match Found!',
            message: lostMatchMsg,
            relatedId: foundItem.id,
          },
        });
        // Push to WhatsApp
        await sendWhatsAppNotification(lostItem.userId, 'Potential Match Found!', lostMatchMsg);

        // Notify the found item's poster
        const foundMatchMsg = `Someone lost a "${lostItem.title}" near ${lostItem.location} — it could match your found "${foundItem.title}".`;
        await prisma.notification.create({
          data: {
            userId: foundItem.userId,
            type: 'MATCH',
            title: 'Potential Match Found!',
            message: foundMatchMsg,
            relatedId: lostItem.id,
          },
        });
        // Push to WhatsApp
        await sendWhatsAppNotification(foundItem.userId, 'Potential Match Found!', foundMatchMsg);
      }
    }
  }
}

export function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'it', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought', 'used',
    'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our',
    'their', 'what', 'which', 'who', 'whom', 'where', 'when', 'how', 'not',
    'no', 'nor', 'as', 'if', 'then', 'than', 'too', 'very', 'just', 'about',
    'near', 'found', 'lost', 'item', 'please', 'help', 'someone', 'think',
    'i', 'me', 'we', 'us', 'you', 'he', 'she', 'they', 'them',
  ]);

  const keywords = [...new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))
  )];
  
  // Limit to maximum 30 keywords to prevent Dictionary Attack matching
  return keywords.slice(0, 30);
}
