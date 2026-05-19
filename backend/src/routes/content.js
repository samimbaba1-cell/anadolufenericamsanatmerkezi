const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, adminAuth } = require('../middleware/auth');
const contentService = require('../services/contentService');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/content
// @desc    Get site content
// @access  Public (uses cached content)
router.get('/', async (req, res) => {
  try {
    const content = await contentService.getContent();
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json(content);
  } catch (error) {
    console.error('Content load error:', error);
    res.status(500).json({ error: 'İçerik yüklenirken hata oluştu' });
  }
});

// Lightweight admin-only endpoint ensures data is always fresh and contains audit metadata.
router.get('/admin', auth, adminAuth, async (req, res) => {
  try {
    const content = await contentService.getContent({ force: true });
    res.json(content);
  } catch (error) {
    console.error('Content admin load error:', error);
    res.status(500).json({ error: 'İçerik yüklenirken hata oluştu' });
  }
});

router.use(auth);
router.use(adminAuth);

// @route   PUT /api/content
// @desc    Update site content
// @access  Private (Admin)
router.put('/', [
  body('about').isObject().withMessage('Hakkımızda bilgileri gerekli'),
  body('contact').isObject().withMessage('İletişim bilgileri gerekli'),
  body('faq').isArray({ min: 0 }).withMessage('SSS listesi gerekli'),
  body('faq.*.question').optional().isString().withMessage('SSS sorusu geçersiz'),
  body('faq.*.answer').optional().isString().withMessage('SSS cevabı geçersiz'),
  body('legal').optional().isObject().withMessage('Hukuki içerik formatı geçersiz'),
  body('legal.privacyPolicy').optional().isObject(),
  body('legal.privacyPolicy.title').optional().isString(),
  body('legal.privacyPolicy.content').optional().isString(),
  body('legal.termsOfUse').optional().isObject(),
  body('legal.termsOfUse.title').optional().isString(),
  body('legal.termsOfUse.content').optional().isString(),
  body('legal.cookiePolicy').optional().isObject(),
  body('legal.cookiePolicy.title').optional().isString(),
  body('legal.cookiePolicy.content').optional().isString(),
  body('support').optional().isObject().withMessage('Destek içerik formatı geçersiz'),
  body('support.customerService').optional().isObject(),
  body('support.customerService.title').optional().isString(),
  body('support.customerService.email').optional().isString(),
  body('support.paymentOptions').optional().isObject(),
  body('support.paymentOptions.methods').optional().isArray(),
  body('support.paymentOptions.methods.*.name').optional().isString(),
  body('support.paymentOptions.methods.*.description').optional().isString(),
  body('support.paymentOptions.methods.*.details').optional().isString(),
  body('support.paymentOptions.methods.*.enabled').optional().isBoolean()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { about, contact, faq, legal, support } = req.body;
    const updated = await contentService.updateContent({ about, contact, faq, legal, support }, req.user.userId);
    logger.info('Content updated', { adminId: req.user.userId });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
