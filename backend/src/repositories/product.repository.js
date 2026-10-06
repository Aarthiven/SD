const prisma = require('../config/db');

const findAll = () => {
  return prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
  });
};

const findById = (id) => {
  return prisma.product.findUnique({
    where: { id },
    include: { inventory: true },
  });
};

const create = (data) => {
  const { name, description, price, availableQuantity } = data;
  return prisma.product.create({
    data: {
      name,
      description,
      price,
      inventory: {
        create: {
          availableQuantity: availableQuantity ?? 0,
          reservedQuantity: 0,
          soldQuantity: 0,
          version: 0,
        },
      },
    },
    include: { inventory: true },
  });
};

const update = (id, data) => {
  const { name, description, price } = data;
  return prisma.product.update({
    where: { id },
    data: { name, description, price },
  });
};

const hasActiveReservations = async (id) => {
  const count = await prisma.inventoryReservation.count({
    where: {
      inventory: { productId: id },
      status: 'RESERVED',
    },
  });
  return count > 0;
};

const remove = (id) => {
  return prisma.product.delete({ where: { id } });
};

module.exports = {
  findAll,
  findById,
  create,
  update,
  hasActiveReservations,
  remove,
};
