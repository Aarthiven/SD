const prisma = require('../../src/config/db');
const uuidv4 = () => require('crypto').randomUUID();

const createTestUser = async () => {
  return prisma.user.create({
    data: {
      name:  `Test User ${uuidv4()}`,
      email: `test-${uuidv4()}@salestorm.test`,
    },
  });
};

const createTestProduct = async (availableQuantity = 100) => {
  return prisma.product.create({
    data: {
      name:  `Test Product ${uuidv4()}`,
      price: 999,
      inventory: {
        create: {
          availableQuantity,
          reservedQuantity: 0,
          soldQuantity:     0,
          version:          0,
        },
      },
    },
    include: { inventory: true },
  });
};

/** Delete everything for a product (cascade-aware order) */
const cleanupProduct = async (productId) => {
  try {
    // Payment → Order → OrderItem (cascade) → InventoryReservation (cascade on inventory) → Inventory (cascade on product) → Product
    const inventory = await prisma.inventory.findUnique({ where: { productId } });
    if (inventory) {
      const reservations = await prisma.inventoryReservation.findMany({
        where: { inventoryId: inventory.id },
        include: { order: { include: { payment: true } } },
      });
      for (const r of reservations) {
        if (r.order?.payment) await prisma.payment.delete({ where: { id: r.order.payment.id } }).catch(() => {});
        if (r.order)          await prisma.order.delete({ where: { id: r.order.id } }).catch(() => {});
        await prisma.inventoryReservation.delete({ where: { id: r.id } }).catch(() => {});
      }
      await prisma.inventory.delete({ where: { id: inventory.id } }).catch(() => {});
    }
    await prisma.product.delete({ where: { id: productId } }).catch(() => {});
  } catch (e) { /* best-effort cleanup */ }
};

const cleanupUser = async (userId) => {
  try { await prisma.user.delete({ where: { id: userId } }); } catch (_) {}
};

module.exports = { createTestUser, createTestProduct, cleanupProduct, cleanupUser };
