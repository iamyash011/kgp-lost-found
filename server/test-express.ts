import express from 'express';
import adminRoutes from './src/routes/admin';
import request from 'supertest';
import prisma from './src/lib/prisma';

const app = express();
app.use(express.json());

// Mock requireAdmin to just pass through, setting a mock user
app.use('/admin', (req, res, next) => {
  req.user = { id: 'admin-id', email: 'kgp.lost.found@gmail.com', isAdmin: true };
  next();
}, adminRoutes);

async function test() {
  const users = await prisma.user.findMany({ take: 1 });
  if (users.length > 0) {
    console.log('Testing PATCH /admin/users/' + users[0].id + '/ban');
    const res = await request(app)
      .patch('/admin/users/' + users[0].id + '/ban')
      .expect(200);
    console.log('Response:', res.body.isBanned);
  }
}
test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
