import prisma from './src/lib/prisma';

async function main() {
  const items = await prisma.item.findMany();
  console.log(`Total items in DB: ${items.length}`);
  if (items.length > 0) {
    console.log(`First item:`, items[0]);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
