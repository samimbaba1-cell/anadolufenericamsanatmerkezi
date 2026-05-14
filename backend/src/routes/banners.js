const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const { sequelize } = require('../config/database');
const Banner = require('../models/Banner');

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateString(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatBanner(doc) {
  if (!doc) return null;
  const plain = doc.toJSON ? doc.toJSON() : doc;
  const {
    id,
    createdAt,
    updatedAt,
    startDate,
    endDate,
    ...rest
  } = plain;
  return {
    id: id?.toString(),
    ...rest,
    startDate: toDateString(startDate),
    endDate: toDateString(endDate),
    createdAt: toDateString(createdAt),
    updatedAt: toDateString(updatedAt)
  };
}

async function getNextOrder() {
  const lastBanner = await Banner.findOne({ order: [['order', 'DESC']] });
  return lastBanner?.order ? Number(lastBanner.order) + 1 : 1;
}

function buildCreatePayload(body) {
  const title = body.title != null ? String(body.title).trim() : '';
  return {
    title,
    subtitle: body.subtitle || '',
    description: body.description || '',
    image: body.image != null ? String(body.image).trim() : '',
    mobileImage: body.mobileImage != null ? String(body.mobileImage).trim() : '',
    link: body.link || '',
    buttonText: body.buttonText || 'Detay',
    type: body.type || 'hero',
    position: body.position || 'top',
    isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
    order: body.order !== undefined ? Number(body.order) : undefined,
    startDate: parseDate(body.startDate),
    endDate: parseDate(body.endDate),
    targetAudience: body.targetAudience || 'all',
    backgroundColor: body.backgroundColor || '#3B82F6',
    textColor: body.textColor || '#FFFFFF'
  };
}

// Public banners (for storefront)
router.get('/', async (req, res) => {
  try {
    const { type, position, isActive } = req.query;

    const conditions = [];
    if (type) conditions.push({ type });
    if (position) conditions.push({ position });

    let activeFlag = true;
    if (isActive !== undefined) {
      activeFlag = isActive === 'true';
    }
    conditions.push({ isActive: activeFlag });

    const applyDateWindow = isActive === undefined || isActive === 'true';
    if (applyDateWindow) {
      const alias = Banner.name;
      const startCol = `${alias}.start_date`;
      const endCol = `${alias}.end_date`;
      // Takvim günü (CURDATE); DB sütun adları start_date / end_date
      conditions.push({
        [Op.or]: [
          { startDate: null },
          sequelize.where(
            sequelize.fn('DATE', sequelize.col(startCol)),
            Op.lte,
            sequelize.fn('CURDATE')
          )
        ]
      });
      conditions.push({
        [Op.or]: [
          { endDate: null },
          sequelize.where(
            sequelize.fn('DATE', sequelize.col(endCol)),
            Op.gte,
            sequelize.fn('CURDATE')
          )
        ]
      });
    }

    const where = { [Op.and]: conditions };

    const banners = await Banner.findAll({
      where,
      order: [['order', 'ASC'], ['createdAt', 'DESC']]
    });

    res.json(banners.map(formatBanner));
  } catch (error) {
    console.error('Banners fetch error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Admin banners list
router.get('/admin', auth, adminAuth, async (req, res) => {
  try {
    console.log('Admin banners endpoint called');
    const banners = await Banner.findAll({
      order: [['order', 'ASC'], ['createdAt', 'DESC']]
    });
    console.log(`Found ${banners.length} banners`);
    res.json({ items: banners.map(formatBanner) });
  } catch (error) {
    console.error('Admin banners fetch error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Get single banner (admin)
router.get('/:id', auth, adminAuth, async (req, res) => {
  try {
    const banner = await Banner.findByPk(req.params.id);
    if (!banner) {
      return res.status(404).json({ error: 'Banner bulunamadı' });
    }
    res.json(formatBanner(banner));
  } catch (error) {
    console.error('Banner fetch error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Create banner
router.post('/', auth, adminAuth, async (req, res) => {
  try {
    const payload = buildCreatePayload(req.body);
    const hasTitle = String(payload.title || '').trim().length > 0;
    const hasImage = String(payload.image || '').trim().length > 0;
    const hasMobile = String(payload.mobileImage || '').trim().length > 0;
    if (!hasTitle && !hasImage && !hasMobile) {
      return res.status(400).json({
        error: 'En az başlık veya bir görsel (masaüstü / mobil URL veya yüklenen dosya yolu) gerekli'
      });
    }

    if (payload.order === undefined || Number.isNaN(payload.order)) {
      payload.order = await getNextOrder();
    }

    const banner = await Banner.create(payload);
    res.status(201).json(formatBanner(banner));
  } catch (error) {
    console.error('Banner create error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Update banner
router.put('/:id', auth, adminAuth, async (req, res) => {
  try {
    const banner = await Banner.findByPk(req.params.id);

    if (!banner) {
      return res.status(404).json({ error: 'Banner bulunamadı' });
    }

    const plain = banner.toJSON();
    const { id: _omitId, createdAt: _c, updatedAt: _u, ...rest } = plain;
    const mergedInput = { ...rest, ...req.body };
    const updates = buildCreatePayload(mergedInput);
    if (updates.order !== undefined && Number.isNaN(updates.order)) {
      delete updates.order;
    }

    await banner.update(updates);
    await banner.reload();
    res.json(formatBanner(banner));
  } catch (error) {
    console.error('Banner update error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Delete banner
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const banner = await Banner.findByPk(req.params.id);
    if (!banner) {
      return res.status(404).json({ error: 'Banner bulunamadı' });
    }
    await banner.destroy();
    res.json({ message: 'Banner başarıyla silindi' });
  } catch (error) {
    console.error('Banner delete error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Reorder banners
router.post('/reorder', auth, adminAuth, async (req, res) => {
  try {
    const { bannerOrders } = req.body;
    if (!Array.isArray(bannerOrders)) {
      return res.status(400).json({ error: 'Geçersiz sıralama verisi' });
    }

    const operations = bannerOrders.map(async ({ id, order }) => {
      const banner = await Banner.findByPk(id);
      if (banner) {
        await banner.update({ order: Number(order) || 0 });
      }
    });

    await Promise.all(operations);

    res.json({ message: 'Banner sıralaması güncellendi' });
  } catch (error) {
    console.error('Banner reorder error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;
