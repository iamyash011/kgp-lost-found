import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateUser } from '../middleware/auth';
import { sendWhatsAppNotification } from '../lib/notifier';

const router = Router();

// All claim routes require authentication
router.use(authenticateUser);

// ─── POST /api/claims — Submit a claim on an item ─────
router.post('/', async (req: Request, res: Response) => {
  const { itemId, identifyingInfo } = req.body;
  const claimantId = req.user!.id;

  if (!itemId) {
    return res.status(400).json({ error: 'Item ID is required.' });
  }

  try {
    // Check item exists and is active
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.status !== 'ACTIVE') return res.status(400).json({ error: 'This item has already been resolved.' });

    const infoString = identifyingInfo ? identifyingInfo.trim() : '';
    if (item.type === 'FOUND' && infoString.length < 10) {
      return res.status(400).json({
        error: 'Please provide at least 10 characters of identifying information.',
      });
    }

    const finalInfo = infoString.length > 0 
      ? infoString 
      : 'I have found your item and would like to return it.';

    // Can't claim your own item
    if (item.userId === claimantId) {
      return res.status(400).json({ error: 'You cannot claim your own item.' });
    }

    // Rate limit: max 5 pending claims per user
    const pendingCount = await prisma.claim.count({
      where: { claimantId, status: 'PENDING' },
    });
    if (pendingCount >= 5) {
      return res.status(429).json({
        error: 'You have too many pending claims. Please wait for responses before submitting more.',
      });
    }

    // Check for duplicate claim
    const existingClaim = await prisma.claim.findFirst({
      where: { itemId, claimantId, status: { in: ['PENDING', 'MORE_INFO'] } },
    });
    if (existingClaim) {
      return res.status(400).json({ error: 'You already have an active claim on this item.' });
    }

    const claim = await prisma.claim.create({
      data: { itemId, claimantId, identifyingInfo: finalInfo },
    });

    // Notify item owner
    const claimant = await prisma.user.findUnique({ where: { id: claimantId }, select: { name: true } });
    const claimMsg = `${claimant?.name || 'A verified student'} claims "${item.title}" might be theirs. Review their verification details.`;
    await prisma.notification.create({
      data: {
        userId: item.userId,
        type: 'CLAIM_RECEIVED',
        title: 'New Claim on Your Item',
        message: claimMsg,
        relatedId: claim.id,
      },
    });
    // Push to WhatsApp
    await sendWhatsAppNotification(item.userId, 'New Claim on Your Item', claimMsg);

    res.status(201).json(claim);
  } catch (error) {
    console.error('Failed to create claim:', error);
    res.status(500).json({ error: 'Failed to submit claim' });
  }
});

// ─── GET /api/claims/received — Claims on my items ────
router.get('/received', async (req: Request, res: Response) => {
  try {
    const myItems = await prisma.item.findMany({
      where: { userId: req.user!.id },
      select: { id: true },
    });
    const myItemIds = myItems.map(i => i.id);

    const claims = await prisma.claim.findMany({
      where: { itemId: { in: myItemIds } },
      include: {
        item: { select: { id: true, title: true, type: true, imageUrl: true } },
        claimant: { select: { id: true, name: true, trustScore: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(claims);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch received claims' });
  }
});

// ─── GET /api/claims/sent — My submitted claims ───────
router.get('/sent', async (req: Request, res: Response) => {
  try {
    const claims = await prisma.claim.findMany({
      where: { claimantId: req.user!.id },
      include: {
        item: {
          select: { 
            id: true, title: true, type: true, imageUrl: true, location: true, showPosterName: true,
            user: { select: { name: true, whatsappNumber: true } } 
          },
        } as any,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Only reveal WhatsApp for accepted claims, and respect showPosterName
    const sanitized = claims.map((claim: any) => ({
      ...claim,
      item: {
        ...claim.item,
        user: claim.status === 'ACCEPTED' || claim.item.showPosterName
          ? claim.item.user
          : { name: null, whatsappNumber: null },
      },
    }));

    res.json(sanitized);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sent claims' });
  }
});

// ─── PATCH /api/claims/:id/accept — Accept claim ──────
router.patch('/:id/accept', async (req: Request, res: Response) => {
  try {
    const claim = await prisma.claim.findUnique({
      where: { id: req.params['id'] as string },
      include: {
        item: { select: { userId: true, title: true } },
        claimant: { select: { id: true, name: true } },
      },
    });
    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    // Infinite Trust Score Protection
    if (claim.status === 'ACCEPTED') {
      return res.status(400).json({ error: 'This claim has already been accepted.' });
    }

    // Only item owner can accept
    if (claim.item.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Only the item owner can accept claims.' });
    }

    const updated = await prisma.claim.update({
      where: { id: claim.id },
      data: { status: 'ACCEPTED' },
    });

    // Auto-resolve item (Ghost Item Protection)
    await prisma.item.update({
      where: { id: claim.itemId },
      data: { status: 'RESOLVED' },
    });

    // Increment trust score for the poster (finder/reporter)
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { trustScore: { increment: 1 } },
    });

    // Notify claimant
    const acceptMsg = `Your claim on "${claim.item.title}" has been accepted. You can now contact the other party via WhatsApp.`;
    await prisma.notification.create({
      data: {
        userId: claim.claimantId,
        type: 'CLAIM_ACCEPTED',
        title: 'Claim Accepted! 🎉',
        message: acceptMsg,
        relatedId: claim.id,
      },
    });
    // Push to WhatsApp
    await sendWhatsAppNotification(claim.claimantId, 'Claim Accepted! 🎉', acceptMsg);

    // Also create a CONTACT_UNLOCKED notification
    const contactMsg = `WhatsApp contact for "${claim.item.title}" is now available. Check your accepted claims.`;
    await prisma.notification.create({
      data: {
        userId: claim.claimantId,
        type: 'CONTACT_UNLOCKED',
        title: 'Contact Unlocked',
        message: contactMsg,
        relatedId: claim.id,
      },
    });
    // Push to WhatsApp
    await sendWhatsAppNotification(claim.claimantId, 'Contact Unlocked', contactMsg);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to accept claim' });
  }
});

// ─── PATCH /api/claims/:id/reject — Reject claim ──────
router.patch('/:id/reject', async (req: Request, res: Response) => {
  const { responseNote } = req.body;
  try {
    const claim = await prisma.claim.findUnique({
      where: { id: req.params['id'] as string },
      include: { item: { select: { userId: true, title: true } } },
    });
    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    if (claim.item.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Only the item owner can reject claims.' });
    }

    const updated = await prisma.claim.update({
      where: { id: claim.id },
      data: { status: 'REJECTED', responseNote: responseNote || null },
    });

    const rejectMsg = responseNote
      ? `Your claim on "${claim.item.title}" was not accepted. Note: "${responseNote}"`
      : `Your claim on "${claim.item.title}" was not accepted.`;
    await prisma.notification.create({
      data: {
        userId: claim.claimantId,
        type: 'CLAIM_REJECTED',
        title: 'Claim Not Accepted',
        message: rejectMsg,
        relatedId: claim.itemId,
      },
    });
    // Push to WhatsApp
    await sendWhatsAppNotification(claim.claimantId, 'Claim Not Accepted', rejectMsg);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject claim' });
  }
});

// ─── PATCH /api/claims/:id/more-info — Request more details ──
router.patch('/:id/more-info', async (req: Request, res: Response) => {
  const { responseNote } = req.body;
  try {
    const claim = await prisma.claim.findUnique({
      where: { id: req.params['id'] as string },
      include: { item: { select: { userId: true, title: true } } },
    });
    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    if (claim.item.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Only the item owner can request more info.' });
    }

    const updated = await prisma.claim.update({
      where: { id: claim.id },
      data: { status: 'MORE_INFO', responseNote: responseNote || 'Please provide more identifying details.' },
    });

    const moreInfoMsg = `The owner of "${claim.item.title}" needs more details: "${updated.responseNote}"`;
    await prisma.notification.create({
      data: {
        userId: claim.claimantId,
        type: 'CLAIM_MORE_INFO',
        title: 'More Information Requested',
        message: moreInfoMsg,
        relatedId: claim.id,
      },
    });
    // Push to WhatsApp
    await sendWhatsAppNotification(claim.claimantId, 'More Information Requested', moreInfoMsg);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to request more info' });
  }
});

export default router;
