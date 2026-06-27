const express = require('express');
const adminController = require('../controllers/adminController');
const { adminAuth } = require('../middleware/adminAuth');

const router = express.Router();

// Public admin route
router.post('/login', adminController.adminLogin);

// Protected admin routes
router.get('/statistics', adminAuth, adminController.getDashboardStatistics);
router.get('/users', adminAuth, adminController.getAllUsers);
router.get('/orders', adminAuth, adminController.getAllOrders);
router.get('/orders/:orderId/pdf', adminAuth, adminController.downloadOrderPDF);
router.put('/users/:userId/deactivate', adminAuth, adminController.deactivateUser);
router.put('/users/:userId/activate', adminAuth, adminController.activateUser);
router.put('/users/:userId/role', adminAuth, adminController.updateUserRole);

module.exports = router;