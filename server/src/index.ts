import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import itemRoutes from './routes/items';
import notificationRoutes from './routes/notifications';
import adminRoutes from './routes/admin';

dotenv.config();

// Uploads are now handled via Cloudinary, no local filesystem needed

const app = express();

// Allow localhost in dev, and all Vercel/production origins
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? true  // Allow all origins in production (same-domain on Vercel)
  : ['http://localhost:5173', 'http://localhost:5174'];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());


// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'KGP Lost & Found API is running 🚀' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
}

export default app;
