const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, adminAuth } = require('../middleware/auth');
const seoService = require('../services/seoService');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const data = await seoService.getSeoSettings();
    res.json(data);
  } catch (error) {
    console.error('SEO get error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.get('/sitemap-status', async (req, res) => {
  try {
    const status = await seoService.getSitemapStatus();
    res.json(status);
  } catch (error) {
    console.error('Sitemap status error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.get('/robots', async (req, res) => {
  try {
    const robotsTxt = await seoService.getRobotsTxt();
    res.set('Content-Type', 'text/plain');
    res.send(robotsTxt);
  } catch (error) {
    console.error('Robots.txt error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.use(auth);
router.use(adminAuth);

router.put('/', [
  body('siteTitle').isString().withMessage('Site başlığı gerekli'),
  body('siteDescription').isString().withMessage('Site açıklaması gerekli'),
  body('twitterCard').optional().isString(),
  body('canonicalUrl').optional({ checkFalsy: true }).isURL().withMessage('Geçerli bir canonical URL girin'),
  body('sitemapUrl').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation Error', details: errors.array() });
    }

    const updated = await seoService.updateSeoSettings(req.body, req.user.userId);
    res.json(updated);
  } catch (error) {
    console.error('SEO save error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.post('/generate-sitemap', async (req, res) => {
  try {
    const result = await seoService.generateSitemap(req.user.userId);
    res.json(result);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    res.status(500).json({ error: 'Sitemap oluşturma hatası' });
  }
});

module.exports = router;
