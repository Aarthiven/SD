const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // Create 5 sample users
  for (let i = 1; i <= 5; i++) {
    await prisma.user.upsert({
      where: { email: `user${i}@example.com` },
      update: {},
      create: {
        name: `Sample User ${i}`,
        email: `user${i}@example.com`,
      },
    });
  }
  console.log('Created 5 users.');

  // Create 1 product with inventory
  const product = await prisma.product.create({
    data: {
      name: 'Flash Sale Product',
      description: 'An exclusive flash sale product',
      price: 999.0,
      inventory: {
        create: {
          availableQuantity: 100,
          reservedQuantity: 0,
          soldQuantity: 0,
        },
      },
    },
  });
  console.log(`Created product: ${product.name} with 100 inventory.`);
  
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
