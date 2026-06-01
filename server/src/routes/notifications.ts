import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateUser } from '../middleware/auth';

const router = Router();

router.use(authenticateUser);

// ─── GET /api/notifications — All notifications for user ──
router.get('/', async (req: Request, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// ─── GET /api/notifications/unread-count — Quick badge count ──
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user!.id, isRead: false },
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// ─── PATCH /api/notifications/:id/read — Mark one as read ──
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const notif = await prisma.notification.findUnique({
      where: { id: req.params['id'] as string },
    });
    if (!notif || notif.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const updated = await prisma.notification.update({
      where: { id: notif.id },
      data: { isRead: true },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// ─── PATCH /api/notifications/read-all — Mark all as read ──
router.patch('/read-all', async (req: Request, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

export default router;
