import prisma from './src/lib/prisma';

async function main() {
  console.log('Starting seeding...');

  // Ensure there's a user to associate items with
  let user = await prisma.user.findFirst({
    where: { email: 'admin@kgp.edu' }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        googleId: 'dummy-google-id-12345',
        email: 'admin@kgp.edu',
        name: 'System Admin',
        whatsappNumber: '9876543210',
        showNamePublicly: true,
        showWhatsappPublicly: true,
        trustScore: 100
      }
    });
    console.log('Created dummy user:', user.name);
  } else {
    console.log('Found existing user:', user.name);
  }

  const items = [
    // LOST ITEMS
    {
      userId: user.id,
      type: 'LOST' as const,
      title: 'Blue Umbrella',
      description: 'Lost a blue folding umbrella with a wooden handle during the afternoon classes.',
      location: 'Nalanda Classroom Complex',
      category: 'Accessories',
      color: 'Blue',
      dateOccurred: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      urgency: 'NORMAL' as const,
      status: 'ACTIVE' as const
    },
    {
      userId: user.id,
      type: 'LOST' as const,
      title: 'boAt Airdopes 141',
      description: 'Lost my black boAt true wireless earbuds case along with the earbuds.',
      location: 'Gymkhana',
      category: 'Electronics',
      color: 'Black',
      brand: 'boAt',
      dateOccurred: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      urgency: 'URGENT' as const,
      status: 'ACTIVE' as const
    },
    {
      userId: user.id,
      type: 'LOST' as const,
      title: 'HP Scientific Calculator',
      description: 'Left my calculator in the exam hall. Has a small scratch on the screen.',
      location: 'Main Building',
      category: 'Academics',
      color: 'Black',
      brand: 'HP',
      identifyingMarks: 'Scratch on top right of the screen',
      dateOccurred: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      urgency: 'URGENT' as const,
      status: 'ACTIVE' as const
    },
    // FOUND ITEMS
    {
      userId: user.id,
      type: 'FOUND' as const,
      title: 'Milton Water Bottle',
      description: 'Found a silver Milton thermosteel water bottle.',
      location: 'Central Library',
      category: 'Accessories',
      color: 'Silver',
      brand: 'Milton',
      dateOccurred: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      urgency: 'NORMAL' as const,
      status: 'ACTIVE' as const
    },
    {
      userId: user.id,
      type: 'FOUND' as const,
      title: 'Key Bunch',
      description: 'Found a bunch of 3 keys with a small Spiderman keychain attached.',
      location: 'Tech Market',
      category: 'Keys',
      identifyingMarks: 'Spiderman keychain',
      dateOccurred: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      urgency: 'NORMAL' as const,
      status: 'ACTIVE' as const
    },
    {
      userId: user.id,
      type: 'FOUND' as const,
      title: 'Titan Wristwatch',
      description: 'Found a metallic wristwatch on the running track.',
      location: 'Jnan Ghosh Stadium',
      category: 'Electronics/Accessories',
      color: 'Silver',
      brand: 'Titan',
      dateOccurred: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
      urgency: 'NORMAL' as const,
      status: 'ACTIVE' as const
    }
  ];

  console.log(`Inserting ${items.length} items...`);
  
  for (const item of items) {
    await prisma.item.create({
      data: item
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
