import prisma from './src/lib/prisma';

async function main() {
  const items = await prisma.item.findMany({
    where: { status: 'ACTIVE' }
  });
  console.log(`Total ACTIVE items in DB: ${items.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
