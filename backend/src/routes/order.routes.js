const express = require('express');
const router  = express.Router();
const checkoutController = require('../controllers/checkout.controller');

router.get('/:id', checkoutController.getOrderById);

module.exports = router;
