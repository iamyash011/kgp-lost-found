import { Request, Response, NextFunction } from 'express';

export const adminGuard = (req: Request, res: Response, next: NextFunction) => {
  const adminEmail = process.env.ADMIN_EMAIL;
  // Expect requests to pass admin email in header or body
  const callerEmail = req.headers['x-admin-email'] as string;

  if (!adminEmail || !callerEmail || callerEmail.toLowerCase() !== adminEmail.toLowerCase()) {
    return res.status(403).json({ error: 'Forbidden: Admin access only.' });
  }

  next();
};
