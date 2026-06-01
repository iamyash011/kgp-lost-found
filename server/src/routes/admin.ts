import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// All routes protected by requireAdmin middleware
router.use(requireAdmin);

// ─── GET /api/admin/stats — Enhanced analytics ────────
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [totalUsers, totalItems, activeItems, resolvedItems, totalMatches, totalClaims, pendingReports, bannedUsers] = await Promise.all([
      prisma.user.count(),
      prisma.item.count(),
      prisma.item.count({ where: { status: 'ACTIVE' } }),
      prisma.item.count({ where: { status: 'RESOLVED' } }),
      prisma.match.count(),
      prisma.claim.count(),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.user.count({ where: { isBanned: true } }),
    ]);

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const recentItems = await prisma.item.findMany({
      where: { createdAt: { gte: twoWeeksAgo } },
      select: { createdAt: true, type: true },
      orderBy: { createdAt: 'asc' },
    });

    const acceptedClaims = await prisma.claim.count({ where: { status: 'ACCEPTED' } });

    res.json({
      totalUsers, totalItems, activeItems, resolvedItems,
      totalMatches, totalClaims, acceptedClaims, pendingReports, bannedUsers,
      recentItems,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─── GET /api/admin/items — All items with full user info ──
router.get('/items', async (req: Request, res: Response) => {
  try {
    const items = await prisma.item.findMany({
      include: {
        user: { select: { name: true, email: true, whatsappNumber: true, trustScore: true, isBanned: true } },
        _count: { select: { claims: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// ─── DELETE /api/admin/items/:id — Force delete any item ──
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

    // Delete associated data
    await prisma.claim.deleteMany({ where: { itemId } });
    await prisma.match.deleteMany({
      where: { OR: [{ lostItemId: itemId }, { foundItemId: itemId }] },
    });

    await prisma.item.delete({ where: { id: itemId } });

    // Notify the item owner
    await prisma.notification.create({
      data: {
        userId: item.userId,
        type: 'ADMIN_ACTION',
        title: 'Item Removed by Admin',
        message: `Your post "${item.title}" has been removed by an administrator for policy violations.`,
        relatedId: itemId,
      },
    });

    res.json({ message: 'Item deleted by admin.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// ─── PATCH /api/admin/items/:id/resolve ────────────────
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

// ─── GET /api/admin/users — All users with enhanced info ──
router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        _count: { select: { items: true, claimsSent: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ─── PATCH /api/admin/users/:id/ban — Toggle ban status ──
router.patch('/users/:id/ban', async (req: Request, res: Response) => {
  try {
    const userId = req.params['id'] as string;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isBanned: !user.isBanned },
    });

    // Notify the user
    await prisma.notification.create({
      data: {
        userId,
        type: 'ADMIN_ACTION',
        title: updated.isBanned ? 'Account Suspended' : 'Account Reinstated',
        message: updated.isBanned
          ? 'Your account has been suspended due to policy violations. Contact admin for details.'
          : 'Your account has been reinstated. You can now use all features.',
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update ban status' });
  }
});

// ─── DELETE /api/admin/users/:id — Remove user and data ──
router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.params['id'] as string;

    // Get all items from this user
    const userItems = await prisma.item.findMany({ where: { userId } });

    // Delete all claims and matches for this user's items
    for (const item of userItems) {
      await prisma.claim.deleteMany({ where: { itemId: item.id } });
      await prisma.match.deleteMany({
        where: { OR: [{ lostItemId: item.id }, { foundItemId: item.id }] },
      });
    }

    // Delete claims sent by this user
    await prisma.claim.deleteMany({ where: { claimantId: userId } });

    // Delete reports filed by this user
    await prisma.report.deleteMany({ where: { reporterId: userId } });

    // Delete notifications
    await prisma.notification.deleteMany({ where: { userId } });

    // Delete all items
    await prisma.item.deleteMany({ where: { userId } });

    // Delete user
    await prisma.user.delete({ where: { id: userId } });

    res.json({ message: 'User and all associated data deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ─── GET /api/admin/reports — All content reports ─────
router.get('/reports', async (req: Request, res: Response) => {
  try {
    const reports = await prisma.report.findMany({
      include: {
        reporter: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// ─── PATCH /api/admin/reports/:id — Review/dismiss report ──
router.patch('/reports/:id', async (req: Request, res: Response) => {
  const { status } = req.body; // 'REVIEWED' or 'DISMISSED'
  try {
    const updated = await prisma.report.update({
      where: { id: req.params['id'] as string },
      data: { status: status || 'REVIEWED' },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// ─── GET /api/admin/claims — All claims for moderation ──
router.get('/claims', async (req: Request, res: Response) => {
  try {
    const claims = await prisma.claim.findMany({
      include: {
        item: { select: { title: true, type: true, userId: true } },
        claimant: { select: { name: true, email: true, trustScore: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(claims);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch claims' });
  }
});

export default router;
