const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');

// Get a reservation by ID
router.get('/:id', inventoryController.getReservation);

// Release a reservation
router.post('/:id/release', inventoryController.release);

module.exports = router;
