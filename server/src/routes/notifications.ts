import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/notifications/:userId - Get all pending match notifications for a user
router.get('/:userId', async (req: Request, res: Response) => {
  const userId = req.params['userId'] as string;

  try {
    // Find all items belonging to this user
    const userItems = await prisma.item.findMany({
      where: { userId },
      select: { id: true, type: true },
    });

    const lostItemIds = userItems.filter((i) => i.type === 'LOST').map((i) => i.id);
    const foundItemIds = userItems.filter((i) => i.type === 'FOUND').map((i) => i.id);

    // Find matches where the user's items are involved
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { lostItemId: { in: lostItemIds } },
          { foundItemId: { in: foundItemIds } },
        ],
      },
      include: {
        lostItem: {
          include: { user: { select: { name: true, whatsappNumber: true } } },
        },
        foundItem: {
          include: { user: { select: { name: true, whatsappNumber: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PATCH /api/notifications/:matchId/read - Mark a match notification as notified
router.patch('/:matchId/read', async (req: Request, res: Response) => {
  try {
    const updated = await prisma.match.update({
      where: { id: req.params['matchId'] as string },
      data: { status: 'NOTIFIED' },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

export default router;
