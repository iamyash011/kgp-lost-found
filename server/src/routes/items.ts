import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { upload } from '../lib/upload';
import { authenticateUser, optionalAuth } from '../middleware/auth';

const router = Router();

// GET /api/items - Get all active items (with optional type filter)
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  const { type } = req.query;
  try {
    const items = await prisma.item.findMany({
      where: {
        status: 'ACTIVE',
        ...(type ? { type: type as 'LOST' | 'FOUND' } : {}),
      },
      include: {
        user: {
          select: { name: true, whatsappNumber: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // If not authenticated, strip whatsappNumber
    if (!req.user) {
      items.forEach((item) => {
        if (item.user) (item.user as any).whatsappNumber = null;
      });
    }

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// GET /api/items/:id - Get a single item by ID
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const item = await prisma.item.findUnique({
      where: { id: req.params['id'] as string },
      include: {
        user: { select: { name: true, whatsappNumber: true } },
      },
    });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    // If not authenticated, strip whatsappNumber
    if (!req.user && item.user) {
      (item.user as any).whatsappNumber = null;
    }

    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// POST /api/items - Create a new lost/found report with up to 3 images
router.post('/', authenticateUser, (req: Request, res: Response, next) => {
  upload.array('images', 3)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    // Use req.user.id securely, ignore userId from body
    const userId = req.user!.id;
    const { type, title, description, location, identifyingMarks, imageUrl: manualUrl } = req.body;

    if (!type || !title || !description || !location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      let images: string[] = [];
      if (req.files && Array.isArray(req.files)) {
        images = (req.files as Express.Multer.File[]).map((file) => file.path);
      }

      // If no files uploaded, fallback to manually provided URL (for testing/backward compatibility)
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
        },
      });

      // After creating, trigger matching logic
      await findAndStoreMatches(newItem.id, type, title, description);

      res.status(201).json(newItem);
    } catch (error) {
      console.error('Failed to create item:', error);
      res.status(500).json({ error: 'Failed to create item' });
    }
  });
});

// PATCH /api/items/:id/resolve - Mark an item as resolved
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

// DELETE /api/items/:id - Delete an item
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

    await prisma.item.delete({ where: { id: item.id } });
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// POST /api/items/:id/purge-images - Delete uploaded files on server disk to save space
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
        // Fallback for non-JSON or single legacy imageUrl
      }

      // Clear in the DB
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


/**
 * Simple keyword-based matching logic.
 * After a new item is posted, find items of the opposite type
 * that share keywords in their title or description.
 */
async function findAndStoreMatches(newItemId: string, type: string, title: string, description: string) {
  const oppositeType = type === 'LOST' ? 'FOUND' : 'LOST';
  const keywords = [...new Set([...title.toLowerCase().split(/\s+/), ...description.toLowerCase().split(/\s+/)])]
    .filter((w) => w.length > 3); // ignore short words

  const candidates = await prisma.item.findMany({
    where: { type: oppositeType as any, status: 'ACTIVE' },
  });

  for (const candidate of candidates) {
    const candidateWords = [
      ...candidate.title.toLowerCase().split(/\s+/),
      ...candidate.description.toLowerCase().split(/\s+/),
    ];

    const commonWords = keywords.filter((w) => candidateWords.includes(w));
    const score = commonWords.length / keywords.length;

    if (score > 0.2) {
      // More than 20% keyword overlap = potential match
      const lostItemId = type === 'LOST' ? newItemId : candidate.id;
      const foundItemId = type === 'FOUND' ? newItemId : candidate.id;

      // Avoid duplicate matches
      const existing = await prisma.match.findFirst({ where: { lostItemId, foundItemId } });
      if (!existing) {
        await prisma.match.create({ data: { lostItemId, foundItemId, matchScore: score } });
      }
    }
  }
}

export default router;
