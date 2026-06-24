const express = require('express');
const categoryController = require('../controllers/categoryController');
const { adminAuth } = require('../middleware/adminAuth');

const router = express.Router();

// Public routes
router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategoryById);

// Admin routes
router.post('/', adminAuth, categoryController.createCategory);
router.put('/:id', adminAuth, categoryController.updateCategory);
router.delete('/:id', adminAuth, categoryController.deleteCategory);

module.exports = router;