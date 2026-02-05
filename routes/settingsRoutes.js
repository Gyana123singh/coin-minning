const express = require('express');
const router = express.Router();
const {
  getSettings,
  getSocialLinks,
  checkMaintenance,
} = require('../controllers/settingsController');

// All routes are public
router.get('/', getSettings);
router.get('/social', getSocialLinks);
router.get('/maintenance', checkMaintenance);

module.exports = router;
