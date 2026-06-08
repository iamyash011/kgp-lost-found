import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateUser } from '../middleware/auth';

const router = Router();

router.use(authenticateUser);

// ─── POST /api/reports — Submit a report ──────────────
router.post('/', async (req: Request, res: Response) => {
  const { targetType, targetId, reason, details } = req.body;
  const reporterId = req.user!.id;

  if (!targetType || !targetId || !reason) {
    return res.status(400).json({ error: 'Missing required fields: targetType, targetId, reason' });
  }

  const validTypes = ['ITEM', 'USER', 'CLAIM'];
  if (!validTypes.includes(targetType)) {
    return res.status(400).json({ error: 'Invalid targetType. Must be ITEM, USER, or CLAIM.' });
  }

  try {
    // --- Rate Limiting (Anti-Spam) ---
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    const recentReportsCount = await prisma.report.count({
      where: {
        reporterId,
        createdAt: { gte: oneHourAgo }
      }
    });

    if (recentReportsCount >= 5) {
      return res.status(429).json({ error: 'You have reached the limit of 5 reports per hour. Please try again later.' });
    }

    // Prevent duplicate reports from same user on same target
    const existing = await prisma.report.findFirst({
      where: { reporterId, targetType, targetId, status: 'PENDING' },
    });
    if (existing) {
      return res.status(400).json({ error: 'You have already reported this.' });
    }

    const report = await prisma.report.create({
      data: {
        reporterId,
        targetType,
        targetId,
        reason,
        details: details || null,
      },
    });

    // Increment report count on the target user if reporting a user
    if (targetType === 'USER') {
      await prisma.user.update({
        where: { id: targetId },
        data: { reportCount: { increment: 1 } },
      });
    }

    // If reporting an item, increment the item owner's report count
    if (targetType === 'ITEM') {
      const item = await prisma.item.findUnique({ where: { id: targetId }, select: { userId: true } });
      if (item) {
        await prisma.user.update({
          where: { id: item.userId },
          data: { reportCount: { increment: 1 } },
        });
      }
    }

    res.status(201).json(report);
  } catch (error) {
    console.error('Failed to create report:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

export default router;
