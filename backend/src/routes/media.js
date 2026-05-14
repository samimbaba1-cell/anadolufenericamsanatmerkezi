const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const crypto = require('crypto');
const { Op, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const router = express.Router();
const MediaFile = require('../models/MediaFile');
const { auth, adminAuth } = require('../middleware/auth');

const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/media');

async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error('Upload directory creation error:', error);
  }
}

function ensureUploadDirSync() {
  try {
    if (!fsSync.existsSync(UPLOAD_DIR)) {
      fsSync.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('Upload directory sync creation error:', error);
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadDirSync();
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg|webp|mp4|avi|mov|wmv|flv|pdf|doc|docx|txt|rtf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Desteklenmeyen dosya formatı!'));
    }
  }
});

function detectType(mimetype, filename = '') {
  const ext = path.extname(filename).toLowerCase();
  if (/image\//.test(mimetype) || ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
    return 'image';
  }
  if (/video\//.test(mimetype) || ['.mp4', '.avi', '.mov', '.wmv', '.flv'].includes(ext)) {
    return 'video';
  }
  if (/pdf$|word|excel|powerpoint/.test(mimetype) || ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf'].includes(ext)) {
    return 'document';
  }
  return 'other';
}

async function calculateHash(filePath) {
  const hash = crypto.createHash('md5');
  const fileBuffer = await fs.readFile(filePath);
  hash.update(fileBuffer);
  return hash.digest('hex');
}

router.use(auth);
router.use(adminAuth);

// Media summary stats
router.get('/stats', async (req, res) => {
  try {
    const totalCount = await MediaFile.count();
    
    // Total size using raw SQL
    const [sizeAgg] = await sequelize.query(`
      SELECT SUM(size) as totalSize FROM media_files
    `, { type: Sequelize.QueryTypes.SELECT });
    
    // Type aggregation using raw SQL
    const typeAgg = await sequelize.query(`
      SELECT type as _id, COUNT(*) as count, SUM(size) as totalSize
      FROM media_files
      GROUP BY type
    `, { type: Sequelize.QueryTypes.SELECT });
    
    const recentUploads = await MediaFile.findAll({
      attributes: ['id', 'originalName', 'type', 'size', 'createdAt', 'url'],
      order: [['createdAt', 'DESC']],
      limit: 6
    });

    const countsByType = typeAgg.reduce((acc, item) => {
      const key = item._id || 'other';
      acc[key] = {
        count: parseInt(item.count) || 0,
        totalSize: parseFloat(item.totalSize) || 0
      };
      return acc;
    }, {});

    res.json({
      totalCount,
      totalSize: parseFloat(sizeAgg?.totalSize) || 0,
      countsByType,
      recentUploads: recentUploads.map(u => u.toJSON()),
      lastUploadAt: recentUploads[0]?.createdAt || null
    });
  } catch (error) {
    console.error('Media stats error:', error);
    res.status(500).json({ error: 'Medya istatistikleri alınamadı' });
  }
});

// GET all media files
router.get('/', async (req, res) => {
  try {
    const { type, search, page = 1, limit = 50, sort = 'createdAt', sortDir = 'desc' } = req.query;

    const where = {};
    if (type && type !== 'all') {
      where.type = type;
    }
    if (search) {
      const searchTerm = search.trim();
      where[Op.or] = [
        { originalName: { [Op.like]: `%${searchTerm}%` } },
        { tags: { [Op.like]: `%${searchTerm}%` } }
      ];
    }

    const order = [[sort, sortDir === 'asc' ? 'ASC' : 'DESC'], ['id', 'DESC']];
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);
    
    const { rows: items, count: total } = await MediaFile.findAndCountAll({
      where,
      order,
      offset,
      limit: limitNum
    });

    res.json({
      items: items.map(item => item.toJSON()),
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Media get error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// POST upload multiple files
router.post('/upload', upload.array('files', 10), async (req, res) => {
  try {
    await ensureUploadDir();

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Dosya gerekli' });
    }

    const savedFiles = [];

    for (const file of req.files) {
      const hash = await calculateHash(path.join(UPLOAD_DIR, file.filename));
      let existing = await MediaFile.findOne({ where: { hash } });
      if (existing) {
        // Delete duplicate physical file
        await fs.unlink(path.join(UPLOAD_DIR, file.filename));
        savedFiles.push(existing.toJSON());
        continue;
      }

      const doc = await MediaFile.create({
        originalName: file.originalname,
        filename: file.filename,
        url: `/uploads/media/${file.filename}`,
        size: file.size,
        mimetype: file.mimetype,
        type: detectType(file.mimetype, file.originalname),
        createdById: req.user.userId,
        hash
      });
      savedFiles.push(doc.toJSON());
    }

    res.json({
      message: `${savedFiles.length} dosya başarıyla yüklendi`,
      files: savedFiles
    });
  } catch (error) {
    console.error('Media upload error:', error);
    res.status(500).json({ error: 'Dosya yükleme hatası' });
  }
});

// DELETE media file
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const file = await MediaFile.findByPk(id);
    if (!file) {
      return res.status(404).json({ error: 'Dosya bulunamadı' });
    }

    // Delete physical file
    try {
      await fs.unlink(path.join(UPLOAD_DIR, path.basename(file.filename)));
    } catch (error) {
      console.error('File deletion error:', error);
    }

    await file.destroy();

    res.json({ message: 'Dosya başarıyla silindi' });
  } catch (error) {
    console.error('Media delete error:', error);
    res.status(500).json({ error: 'Dosya silme hatası' });
  }
});

// GET media file info
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const file = await MediaFile.findByPk(id);
    if (!file) {
      return res.status(404).json({ error: 'Dosya bulunamadı' });
    }

    res.json(file.toJSON());
  } catch (error) {
    console.error('Media get error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;
