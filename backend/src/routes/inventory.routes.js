const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');

// Reserve inventory for a product
router.post('/:productId/reserve', inventoryController.reserve);

module.exports = router;
