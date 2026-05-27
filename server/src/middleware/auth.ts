import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

// Extend Express Request to include user
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      email: string;
      isAdmin: boolean;
    };
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';
const ADMIN_EMAIL = 'kgp.lost.found@gmail.com';

export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };

    req.user = {
      id: decoded.id,
      email: decoded.email,
      isAdmin: decoded.email.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
      req.user = {
        id: decoded.id,
        email: decoded.email,
        isAdmin: decoded.email.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
      };
    }
  } catch (error) {
    // Ignore invalid tokens for optional auth
  }
  next();
};

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  // First, authenticate
  authenticateUser(req, res, () => {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    next();
  });
};
