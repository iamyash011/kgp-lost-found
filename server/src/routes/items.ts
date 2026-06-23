import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { upload } from '../lib/upload';
import { authenticateUser, optionalAuth } from '../middleware/auth';
import { containsProfanity } from '../lib/moderation';
import { findAndStoreMatches } from '../lib/matching';

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


export default router;
