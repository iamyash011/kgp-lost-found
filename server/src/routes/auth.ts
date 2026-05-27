import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { authenticateUser } from '../middleware/auth';

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';

// Helper to generate JWT
const generateToken = (id: string, email: string) => {
  return jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '7d' });
};

const isValidWhatsapp = (num: string) => /^[6-9]\d{9}$/.test(num);

// POST /api/auth/google - Verify Google ID token and sign in/up user
router.post('/google', async (req: Request, res: Response) => {
  const { idToken, whatsappNumber, accessToken } = req.body;

  try {
    let email: string, googleId: string, name: string | undefined;

    if (accessToken) {
      // Path 1: useGoogleLogin (implicit flow) — backend securely fetches user info using access token
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        return res.status(401).json({ error: 'Invalid Google access token' });
      }
      const userInfo: any = await response.json();
      email = userInfo.email;
      googleId = userInfo.sub;
      name = userInfo.name;
    } else if (idToken) {
      // Path 2: GoogleLogin component (credential flow) — sends ID token
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email || !payload.sub) {
        return res.status(400).json({ error: 'Invalid Google token' });
      }
      email = payload.email;
      googleId = payload.sub;
      name = payload.name;
    } else {
      return res.status(400).json({ error: 'Missing credentials' });
    }

    // CRITICAL: Only allow IIT KGP student emails or the admin email
    const emailLower = email.toLowerCase();
    if (!emailLower.endsWith('@kgpian.iitkgp.ac.in') && emailLower !== 'kgp.lost.found@gmail.com') {
      return res.status(403).json({
        error: 'Access denied. Only @kgpian.iitkgp.ac.in email addresses are allowed.',
      });
    }

    // Upsert the user in the database
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // New user — WhatsApp number is REQUIRED to create an account
      if (!whatsappNumber) {
        return res.status(403).json({
          code: 'NEW_USER_NEEDS_WHATSAPP',
          error: 'No account found. Please use "Create Account" and provide your WhatsApp number first.',
        });
      }
      if (!isValidWhatsapp(whatsappNumber)) {
        return res.status(400).json({ error: 'Invalid WhatsApp number format. Must be 10 digits starting with 6-9.' });
      }
      user = await prisma.user.create({
        data: {
          googleId,
          email,
          name: name ?? email.split('@')[0],
          whatsappNumber,
        },
      });
    } else {
      // Returning user — update whatsapp if provided and not already set
      if (whatsappNumber) {
        if (!isValidWhatsapp(whatsappNumber)) {
          return res.status(400).json({ error: 'Invalid WhatsApp number format. Must be 10 digits starting with 6-9.' });
        }
        user = await prisma.user.update({
          where: { id: user.id },
          data: { whatsappNumber },
        });
      }
    }

    const token = generateToken(user.id, user.email);
    res.json({ user, token });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// POST /api/auth/mock-login - Sign in with a mock profile for local development ONLY
router.post('/mock-login', async (req: Request, res: Response) => {
  // Hard-block this endpoint in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  const { name, email, whatsappNumber } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Missing email address' });
  }

  // Only allow IIT KGP student emails or the admin email
  const emailLower = email.toLowerCase();
  if (!emailLower.endsWith('@kgpian.iitkgp.ac.in') && emailLower !== 'kgp.lost.found@gmail.com') {
    return res.status(403).json({
      error: 'Access denied. Only @kgpian.iitkgp.ac.in email addresses are allowed.',
    });
  }

  if (whatsappNumber && !isValidWhatsapp(whatsappNumber)) {
    return res.status(400).json({ error: 'Invalid WhatsApp number format. Must be 10 digits starting with 6-9.' });
  }

  try {
    // Find or create the user in the database
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId: `mock-google-id-${Math.random().toString(36).substring(7)}`,
          email,
          name: name || email.split('@')[0],
          whatsappNumber: whatsappNumber || '9999999999',
        },
      });
    } else {
      // Update name or whatsappNumber if provided and not set or changed
      const updateData: any = {};
      if (name && user.name !== name) updateData.name = name;
      if (whatsappNumber && user.whatsappNumber !== whatsappNumber) {
        updateData.whatsappNumber = whatsappNumber;
      }

      if (Object.keys(updateData).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
      }
    }

    const token = generateToken(user.id, user.email);
    res.json({ user, token });
  } catch (error) {
    console.error('Mock auth error:', error);
    res.status(500).json({ error: 'Mock authentication failed' });
  }
});


// GET /api/auth/me/:userId - Get current user profile
router.get('/me/:userId', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params['userId'] as string },
      select: { id: true, name: true, email: true, whatsappNumber: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PATCH /api/auth/me/:userId - Update WhatsApp number
router.patch('/me/:userId', authenticateUser, async (req: Request, res: Response) => {
  const { whatsappNumber } = req.body;
  try {
    if (req.user!.id !== req.params['userId']) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!whatsappNumber || !isValidWhatsapp(whatsappNumber)) {
      return res.status(400).json({ error: 'Invalid WhatsApp number format. Must be 10 digits starting with 6-9.' });
    }
    const user = await prisma.user.update({
      where: { id: req.params['userId'] as string },
      data: { whatsappNumber },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

export default router;
