const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const crypto = require('crypto');

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
    const [totalCount, sizeAgg, typeAgg, recentUploads] = await Promise.all([
      MediaFile.countDocuments(),
      MediaFile.aggregate([
        {
          $group: {
            _id: null,
            totalSize: { $sum: '$size' }
          }
        }
      ]),
      MediaFile.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalSize: { $sum: '$size' }
          }
        }
      ]),
      MediaFile.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .select('originalName type size createdAt url')
        .lean()
    ]);

    const countsByType = typeAgg.reduce((acc, item) => {
      const key = item._id || 'other';
      acc[key] = {
        count: item.count,
        totalSize: item.totalSize
      };
      return acc;
    }, {});

    res.json({
      totalCount,
      totalSize: sizeAgg[0]?.totalSize || 0,
      countsByType,
      recentUploads,
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

    const filter = {};
    if (type && type !== 'all') {
      filter.type = type;
    }
    if (search) {
      filter.$or = [
        { originalName: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOrder = sortDir === 'asc' ? 1 : -1;
    const items = await MediaFile.find(filter)
      .sort({ [sort]: sortOrder, _id: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    const total = await MediaFile.countDocuments(filter);

    res.json({
      items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
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
      let existing = await MediaFile.findOne({ hash });
      if (existing) {
        // Delete duplicate physical file
        await fs.unlink(path.join(UPLOAD_DIR, file.filename));
        savedFiles.push(existing.toObject());
        continue;
      }

      const doc = await MediaFile.create({
        originalName: file.originalname,
        filename: file.filename,
        url: `/uploads/media/${file.filename}`,
        size: file.size,
        mimetype: file.mimetype,
        type: detectType(file.mimetype, file.originalname),
        createdBy: req.user.userId,
        hash
      });
      savedFiles.push(doc.toObject());
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

    const file = await MediaFile.findById(id);
    if (!file) {
      return res.status(404).json({ error: 'Dosya bulunamadı' });
    }

    // Delete physical file
    try {
      await fs.unlink(path.join(UPLOAD_DIR, path.basename(file.filename)));
    } catch (error) {
      console.error('File deletion error:', error);
    }

    await MediaFile.deleteOne({ _id: id });

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

    const file = await MediaFile.findById(id).lean();
    if (!file) {
      return res.status(404).json({ error: 'Dosya bulunamadı' });
    }

    res.json(file);
  } catch (error) {
    console.error('Media get error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;
