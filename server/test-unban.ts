import prisma from './src/lib/prisma';
async function main() {
  const users = await prisma.user.findMany({ take: 1 });
  if(users.length > 0) {
    const user = users[0];
    console.log('User:', user.id, user.isBanned);
    try {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { isBanned: !user.isBanned },
      });
      console.log('Updated:', updated.isBanned);
      
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'ADMIN_ACTION',
          title: updated.isBanned ? 'Suspended' : 'Reinstated',
          message: 'Test',
        },
      });
      console.log('Notification created');
    } catch (e) {
      console.error('Error:', e.message);
    }
  } else {
    console.log('No users found');
  }
}
main().finally(() => prisma.$disconnect());
