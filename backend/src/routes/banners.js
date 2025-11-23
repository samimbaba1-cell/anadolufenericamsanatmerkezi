const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
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
  const plain = doc.toObject ? doc.toObject() : doc;
  const {
    _id,
    __v,
    createdAt,
    updatedAt,
    startDate,
    endDate,
    ...rest
  } = plain;
  return {
    id: _id?.toString(),
    ...rest,
    startDate: toDateString(startDate),
    endDate: toDateString(endDate),
    createdAt: toDateString(createdAt),
    updatedAt: toDateString(updatedAt)
  };
}

async function getNextOrder() {
  const lastBanner = await Banner.findOne().sort({ order: -1 }).lean();
  return lastBanner?.order ? Number(lastBanner.order) + 1 : 1;
}

function buildCreatePayload(body) {
  return {
    title: body.title,
    subtitle: body.subtitle || '',
    description: body.description || '',
    image: body.image || '',
    mobileImage: body.mobileImage || '',
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
    const now = new Date();

    const query = {};

    if (type) query.type = type;
    if (position) query.position = position;

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    } else {
      query.isActive = true;
    }

    if (query.isActive) {
      query.$and = [
        {
          $or: [
            { startDate: { $exists: false } },
            { startDate: null },
            { startDate: { $lte: now } }
          ]
        },
        {
          $or: [
            { endDate: { $exists: false } },
            { endDate: null },
            { endDate: { $gte: now } }
          ]
        }
      ];
    }

    const banners = await Banner.find(query)
      .sort({ order: 1, createdAt: -1 })
      .lean();

    res.json(banners.map(formatBanner));
  } catch (error) {
    console.error('Banners fetch error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Admin banners list
router.get('/admin', auth, adminAuth, async (req, res) => {
  try {
    const banners = await Banner.find({})
      .sort({ order: 1, createdAt: -1 })
      .lean();
    res.json(banners.map(formatBanner));
  } catch (error) {
    console.error('Admin banners fetch error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Get single banner (admin)
router.get('/:id', auth, adminAuth, async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id).lean();
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
    if (!req.body.title) {
      return res.status(400).json({ error: 'Banner başlığı gerekli' });
    }

    const payload = buildCreatePayload(req.body);
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
    const updates = buildCreatePayload(req.body);
    if (updates.order !== undefined && Number.isNaN(updates.order)) {
      delete updates.order;
    }

    const banner = await Banner.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!banner) {
      return res.status(404).json({ error: 'Banner bulunamadı' });
    }

    res.json(formatBanner(banner));
  } catch (error) {
    console.error('Banner update error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Delete banner
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) {
      return res.status(404).json({ error: 'Banner bulunamadı' });
    }
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

    const operations = bannerOrders.map(({ id, order }) =>
      Banner.findByIdAndUpdate(
        id,
        { order: Number(order) || 0 },
        { new: false }
      )
    );

    await Promise.all(operations);

    res.json({ message: 'Banner sıralaması güncellendi' });
  } catch (error) {
    console.error('Banner reorder error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;
