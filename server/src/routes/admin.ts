import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// All routes protected by requireAdmin middleware
router.use(requireAdmin);

// GET /api/admin/stats - Platform analytics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [totalUsers, totalItems, activeItems, resolvedItems, totalMatches] = await Promise.all([
      prisma.user.count(),
      prisma.item.count(),
      prisma.item.count({ where: { status: 'ACTIVE' } }),
      prisma.item.count({ where: { status: 'RESOLVED' } }),
      prisma.match.count(),
    ]);

    // Items created per day over the last 14 days
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const recentItems = await prisma.item.findMany({
      where: { createdAt: { gte: twoWeeksAgo } },
      select: { createdAt: true, type: true },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ totalUsers, totalItems, activeItems, resolvedItems, totalMatches, recentItems });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/admin/items - All items with user info
router.get('/items', async (req: Request, res: Response) => {
  try {
    const items = await prisma.item.findMany({
      include: {
        user: { select: { name: true, email: true, whatsappNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// DELETE /api/admin/items/:id - Force delete any item
router.delete('/items/:id', async (req: Request, res: Response) => {
  try {
    const itemId = req.params['id'] as string;
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    // Delete from Cloudinary if images exist
    if (item.imageUrl) {
      try {
        const { v2: cloudinary } = require('cloudinary');
        const imagePaths: string[] = JSON.parse(item.imageUrl);
        for (const imgUrl of imagePaths) {
          const parts = imgUrl.split('/');
          const filename = parts[parts.length - 1];
          const publicId = 'kgp_lost_found/' + filename.split('.')[0];
          try { await cloudinary.uploader.destroy(publicId); } catch (_) {}
        }
      } catch (_) {}
    }

    // Delete associated matches first to avoid FK violations
    await prisma.match.deleteMany({
      where: { OR: [{ lostItemId: itemId }, { foundItemId: itemId }] },
    });

    await prisma.item.delete({ where: { id: itemId } });
    res.json({ message: 'Item deleted by admin.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// PATCH /api/admin/items/:id/resolve - Force resolve any item
router.patch('/items/:id/resolve', async (req: Request, res: Response) => {
  try {
    const updated = await prisma.item.update({
      where: { id: req.params['id'] as string },
      data: { status: 'RESOLVED' },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve item' });
  }
});

// GET /api/admin/users - All users
router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// DELETE /api/admin/users/:id - Remove a user and all their data
router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.params['id'] as string;

    // Get all items from this user
    const userItems = await prisma.item.findMany({ where: { userId } });

    // Delete all matches for this user's items
    for (const item of userItems) {
      await prisma.match.deleteMany({
        where: { OR: [{ lostItemId: item.id }, { foundItemId: item.id }] },
      });
    }

    // Delete all items
    await prisma.item.deleteMany({ where: { userId } });

    // Delete user
    await prisma.user.delete({ where: { id: userId } });

    res.json({ message: 'User and all associated data deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
