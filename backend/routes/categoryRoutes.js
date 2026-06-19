const express = require('express');
const router = express.Router();
const {
  getCategories,
  getCategory,
  createCategory,
} = require('../controllers/categoryController');

router.get('/', getCategories);
router.get('/:id', getCategory);
router.post('/', createCategory); // Admin only (we'll add auth later)

module.exports = router;