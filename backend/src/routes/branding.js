const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/branding/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir!'));
    }
  }
});

// Ensure upload directory exists
const ensureUploadDir = async () => {
  try {
    await fs.mkdir('uploads/branding', { recursive: true });
  } catch (error) {
    console.error('Upload directory creation error:', error);
  }
};

// GET branding settings
router.get('/', async (req, res) => {
  try {
    // In a real app, this would come from database
    const defaultBranding = {
      siteName: "Anadolu Feneri Cam Sanat Merkezi",
      siteSlogan: "Kaliteli ürünler, güvenilir hizmet",
      logo: null,
      favicon: null,
      primaryColor: "#3B82F6",
      secondaryColor: "#8B5CF6",
      accentColor: "#F59E0B"
    };

    res.json(defaultBranding);
  } catch (error) {
    console.error('Branding get error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// POST branding settings
router.post('/', async (req, res) => {
  try {
    const { siteName, siteSlogan, logo, favicon, primaryColor, secondaryColor, accentColor } = req.body;

    // Validate required fields
    if (!siteName || !siteSlogan) {
      return res.status(400).json({ error: 'Site adı ve sloganı gereklidir' });
    }

    // In a real app, save to database
    const brandingData = {
      siteName,
      siteSlogan,
      logo,
      favicon,
      primaryColor,
      secondaryColor,
      accentColor,
      updatedAt: new Date()
    };

    // Here you would save to database
    // await Branding.findOneAndUpdate({}, brandingData, { upsert: true });

    res.json({ 
      message: 'Marka ayarları başarıyla kaydedildi',
      data: brandingData 
    });
  } catch (error) {
    console.error('Branding save error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// POST upload logo
router.post('/upload-logo', upload.single('logo'), async (req, res) => {
  try {
    await ensureUploadDir();

    if (!req.file) {
      return res.status(400).json({ error: 'Logo dosyası gerekli' });
    }

    const logoUrl = `/uploads/branding/${req.file.filename}`;

    res.json({ 
      message: 'Logo başarıyla yüklendi',
      logoUrl 
    });
  } catch (error) {
    console.error('Logo upload error:', error);
    res.status(500).json({ error: 'Logo yükleme hatası' });
  }
});

// POST upload favicon
router.post('/upload-favicon', upload.single('favicon'), async (req, res) => {
  try {
    await ensureUploadDir();

    if (!req.file) {
      return res.status(400).json({ error: 'Favicon dosyası gerekli' });
    }

    const faviconUrl = `/uploads/branding/${req.file.filename}`;

    res.json({ 
      message: 'Favicon başarıyla yüklendi',
      faviconUrl 
    });
  } catch (error) {
    console.error('Favicon upload error:', error);
    res.status(500).json({ error: 'Favicon yükleme hatası' });
  }
});

module.exports = router;
