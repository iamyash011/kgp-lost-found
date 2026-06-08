import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { upload } from '../lib/upload';
import { authenticateUser, optionalAuth } from '../middleware/auth';
import { containsProfanity } from '../lib/moderation';
import { getStandardLocation } from '../lib/locations';

const router = Router();

// ─── GET /api/items — Privacy-aware listing ────────────
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  const { type, category } = req.query;
  try {
    const items = await prisma.item.findMany({
      where: {
        status: 'ACTIVE',
        ...(type ? { type: type as 'LOST' | 'FOUND' } : {}),
        ...(category ? { category: category as string } : {}),
      },
      include: {
        user: {
          select: { id: true, name: true, whatsappNumber: true, email: true, trustScore: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Apply privacy rules
    const sanitized = items.map((item) => {
      const isOwner = req.user?.id === item.userId;
      const isAdmin = req.user?.isAdmin;

      return {
        ...item,
        user: {
          id: (isOwner || isAdmin || item.showPosterName) ? item.user.id : null,
          name: (isOwner || isAdmin || item.showPosterName) ? item.user.name : null,
          whatsappNumber: (isOwner || isAdmin || item.showPosterWhatsapp) ? item.user.whatsappNumber : null,
          email: (isOwner || isAdmin) ? item.user.email : null,
          trustScore: item.user.trustScore,
          isVerified: true, // all users are verified campus users
        },
      };
    });

    res.json(sanitized);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// ─── GET /api/items/:id — Single item with privacy ────
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const item = await prisma.item.findUnique({
      where: { id: req.params['id'] as string },
      include: {
        user: { select: { id: true, name: true, whatsappNumber: true, trustScore: true } },
      },
    });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const isOwner = req.user?.id === item.userId;
    const isAdmin = req.user?.isAdmin;

    const sanitized = {
      ...item,
      user: {
        id: (isOwner || isAdmin || item.showPosterName) ? item.user.id : null,
        name: (isOwner || isAdmin || item.showPosterName) ? item.user.name : null,
        whatsappNumber: (isOwner || isAdmin || item.showPosterWhatsapp) ? item.user.whatsappNumber : null,
        trustScore: item.user.trustScore,
        isVerified: true,
      },
    };

    res.json(sanitized);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// ─── GET /api/items/:id/matches — Potential matches for an item ──
router.get('/:id/matches', authenticateUser, async (req: Request, res: Response) => {
  try {
    const itemId = req.params['id'] as string;
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    // Only the owner can view matches for their item
    if (item.userId !== req.user!.id && !req.user!.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const matches = await prisma.match.findMany({
      where: item.type === 'LOST'
        ? { lostItemId: itemId }
        : { foundItemId: itemId },
      include: {
        lostItem: {
          include: { user: { select: { id: true, name: true, trustScore: true } } },
        },
        foundItem: {
          include: { user: { select: { id: true, name: true, trustScore: true } } },
        },
      },
      orderBy: { matchScore: 'desc' },
      take: 10,
    });

    // Sanitize user names based on privacy settings
    const sanitizedMatches = matches.map(match => ({
      ...match,
      lostItem: {
        ...match.lostItem,
        user: {
          ...match.lostItem.user,
          id: (req.user?.id === match.lostItem.userId || req.user?.isAdmin || match.lostItem.showPosterName) ? match.lostItem.user.id : null,
          name: match.lostItem.showPosterName ? match.lostItem.user.name : null
        }
      },
      foundItem: {
        ...match.foundItem,
        user: {
          ...match.foundItem.user,
          id: (req.user?.id === match.foundItem.userId || req.user?.isAdmin || match.foundItem.showPosterName) ? match.foundItem.user.id : null,
          name: match.foundItem.showPosterName ? match.foundItem.user.name : null
        }
      }
    }));

    res.json(sanitizedMatches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// ─── POST /api/items — Create item with new fields ────
router.post('/', authenticateUser, (req: Request, res: Response, next) => {
  upload.array('images', 3)(req, res, async (err: any) => {
    if (err) {
      if (err.message && err.message.toLowerCase().includes('moderation')) {
        return res.status(400).json({ error: 'Image rejected: Contains inappropriate or explicit content.' });
      }
      return res.status(400).json({ error: err.message || 'Image upload failed' });
    }

    const userId = req.user!.id;
    const {
      type, title, description, location, identifyingMarks,
      imageUrl: manualUrl,
      category, color, brand, dateOccurred,
      showPosterName, showPosterWhatsapp,
      sensitiveImage, urgency, reward,
    } = req.body;

    if (!type || !title || !description || !location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (containsProfanity([title, description, location, identifyingMarks])) {
      return res.status(400).json({ error: 'Your report contains inappropriate language and cannot be submitted.' });
    }

    try {
      // --- Rate Limiting (Anti-Spam) ---
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      
      const recentItemsCount = await prisma.item.count({
        where: {
          userId,
          createdAt: { gte: oneHourAgo }
        }
      });
      
      if (recentItemsCount >= 5) {
        return res.status(429).json({ error: 'You have reached the limit of 5 items per hour. Please try again later.' });
      }

      let images: string[] = [];
      if (req.files && Array.isArray(req.files)) {
        images = (req.files as Express.Multer.File[]).map((file) => file.path);
      }

      let storedImageUrl: string | null = null;
      if (images.length > 0) {
        storedImageUrl = JSON.stringify(images);
      } else if (manualUrl) {
        storedImageUrl = JSON.stringify([manualUrl]);
      }

      const newItem = await prisma.item.create({
        data: {
          userId,
          type,
          title,
          description,
          location,
          identifyingMarks: identifyingMarks || null,
          imageUrl: storedImageUrl,
          category: category || null,
          color: color || null,
          brand: brand || null,
          dateOccurred: dateOccurred ? new Date(dateOccurred) : null,
          showPosterName: showPosterName === 'true' || showPosterName === true,
          showPosterWhatsapp: showPosterWhatsapp === 'true' || showPosterWhatsapp === true,
          sensitiveImage: sensitiveImage === 'true' || sensitiveImage === true,
          urgency: urgency === 'URGENT' ? 'URGENT' : 'NORMAL',
          reward: reward || null,
        },
      });

      // Trigger multi-factor matching
      await findAndStoreMatches(newItem);

      res.status(201).json(newItem);
    } catch (error: any) {
      console.error('Failed to create item:', error);
      res.status(500).json({ error: `Server error: ${error.message || 'Unknown error'}` });
    }
  });
});

// ─── PATCH /api/items/:id/resolve ──────────────────────
router.patch('/:id/resolve', authenticateUser, async (req: Request, res: Response) => {
  try {
    const item = await prisma.item.findUnique({ where: { id: req.params['id'] as string } });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    if (item.userId !== req.user!.id && !req.user!.isAdmin) {
      return res.status(403).json({ error: 'Forbidden: You can only resolve your own items' });
    }

    const updated = await prisma.item.update({
      where: { id: item.id },
      data: { status: 'RESOLVED' },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve item' });
  }
});

// ─── DELETE /api/items/:id ─────────────────────────────
router.delete('/:id', authenticateUser, async (req: Request, res: Response) => {
  try {
    const item = await prisma.item.findUnique({ where: { id: req.params['id'] as string } });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    if (item.userId !== req.user!.id && !req.user!.isAdmin) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own items' });
    }

    if (item.imageUrl) {
      try {
        const imagePaths: string[] = JSON.parse(item.imageUrl);
        if (Array.isArray(imagePaths)) {
          const { v2: cloudinary } = require('cloudinary');
          for (const imgUrl of imagePaths) {
            const parts = imgUrl.split('/');
            const filename = parts[parts.length - 1];
            const publicId = 'kgp_lost_found/' + filename.split('.')[0];
            try {
              await cloudinary.uploader.destroy(publicId);
            } catch (err) {}
          }
        }
      } catch (err) {
        // legacy URL or JSON parse error
      }
    }

    // Delete associated claims and matches first
    await prisma.claim.deleteMany({ where: { itemId: item.id } });
    await prisma.match.deleteMany({
      where: { OR: [{ lostItemId: item.id }, { foundItemId: item.id }] },
    });

    await prisma.item.delete({ where: { id: item.id } });
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// ─── POST /api/items/:id/purge-images ──────────────────
router.post('/:id/purge-images', authenticateUser, async (req: Request, res: Response) => {
  const itemId = req.params['id'] as string;
  try {
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (item.userId !== req.user!.id && !req.user!.isAdmin) {
      return res.status(403).json({ error: 'Forbidden: You can only purge your own items' });
    }

    if (item.imageUrl) {
      try {
        const imagePaths: string[] = JSON.parse(item.imageUrl);
        if (Array.isArray(imagePaths)) {
          const { v2: cloudinary } = require('cloudinary');
          for (const imgUrl of imagePaths) {
            const parts = imgUrl.split('/');
            const filename = parts[parts.length - 1];
            const publicId = 'kgp_lost_found/' + filename.split('.')[0];
            try {
              await cloudinary.uploader.destroy(publicId);
            } catch (err) {
              console.error(`Failed to delete cloudinary file: ${publicId}`, err);
            }
          }
        }
      } catch (e) {
        // Fallback for non-JSON
      }

      await prisma.item.update({
        where: { id: itemId },
        data: { imageUrl: null }
      });
    }

    res.json({ message: 'Images successfully deleted from disk to reclaim storage.' });
  } catch (error) {
    console.error('Failed to purge images:', error);
    res.status(500).json({ error: 'Failed to purge images' });
  }
});


// ═══════════════════════════════════════════════════════
// Multi-factor matching algorithm
// ═══════════════════════════════════════════════════════

interface MatchableItem {
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

async function findAndStoreMatches(newItem: MatchableItem) {
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

    // Minimum threshold to create a match
    if (score >= 0.2) {
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
        await prisma.notification.create({
          data: {
            userId: lostItem.userId,
            type: 'MATCH',
            title: 'Potential Match Found!',
            message: `A found "${foundItem.title}" near ${foundItem.location} could match your lost "${lostItem.title}".`,
            relatedId: match.id,
          },
        });

        // Notify the found item's poster
        await prisma.notification.create({
          data: {
            userId: foundItem.userId,
            type: 'MATCH',
            title: 'Potential Match Found!',
            message: `Someone lost a "${lostItem.title}" near ${lostItem.location} — it could match your found "${foundItem.title}".`,
            relatedId: match.id,
          },
        });
      }
    }
  }
}

function extractKeywords(text: string): string[] {
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

export default router;
