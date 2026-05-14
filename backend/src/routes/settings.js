const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const settingsService = require('../services/settingsService');
const logger = require('../utils/logger');

async function adminOnly(req, res, next) {
  try {
    const user = await User.findByPk(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin erişimi gerekli' });
    }
    req.admin = user;
    next();
  } catch (error) {
    next(error);
  }
}

router.get('/public', async (req, res, next) => {
  try {
    const data = await settingsService.getPublicSettings();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.use(auth);
router.use(adminOnly);

router.get('/', async (req, res, next) => {
  try {
    const settings = await settingsService.getSettings({ includeSecrets: true });
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const payload = req.body || {};
    const updated = await settingsService.updateSettings(payload, req.admin.id);
    logger.info('Site settings updated', {
      adminId: req.admin.id,
      adminEmail: req.admin.email
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.post('/reset', async (req, res, next) => {
  try {
    const defaults = await settingsService.resetToDefaults(req.admin.id);
    logger.info('Site settings reset to defaults', {
      adminId: req.admin.id,
      adminEmail: req.admin.email
    });
    res.json(defaults);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

