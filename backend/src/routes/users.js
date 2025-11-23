const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        error: 'Kullanıcı bulunamadı'
      });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        lastLogin: user.lastLogin,
        loginCount: user.loginCount,
        profile: user.profile,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   POST /api/users/register
// @desc    Register user
// @access  Public
router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('İsim 2-50 karakter arası olmalı'),
  body('email').isEmail().normalizeEmail().withMessage('Geçerli bir email girin'),
  body('password').isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalı')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        error: 'Bu email adresi zaten kullanılıyor'
      });
    }

    // Create user
    const user = new User({
      name,
      email,
      password
    });

    await user.save();

    // Generate token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.status(201).json({
      message: 'Kullanıcı başarıyla oluşturuldu',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   POST /api/users/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Geçerli bir email girin'),
  body('password').notEmpty().withMessage('Şifre gerekli')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user and include password
    const user = await User.findOne({ email }).select('+password +status +isActive');
    if (!user) {
      return res.status(401).json({
        error: 'Geçersiz email veya şifre'
      });
    }

    if (user.status === 'banned') {
      return res.status(403).json({
        error: 'Hesabınız yasaklandı. Lütfen destek ile iletişime geçin.'
      });
    }

    if (!user.isActive || user.status === 'inactive') {
      return res.status(403).json({
        error: 'Hesabınız pasif durumda. Lütfen destek ile iletişime geçin.'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Geçersiz email veya şifre'
      });
    }

    // Generate token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();

    res.json({
      message: 'Giriş başarılı',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        lastLogin: user.lastLogin,
        loginCount: user.loginCount
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private (Admin)
router.get('/', auth, adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role, status } = req.query;

    const numericLimit = Math.min(parseInt(limit, 10) || 10, 100);
    const numericPage = Math.max(parseInt(page, 10) || 1, 1);
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role && role !== 'all') {
      filter.role = role;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(numericLimit)
      .skip((numericPage - 1) * numericLimit)
      .lean();

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        page: numericPage,
        limit: numericLimit,
        total,
        pages: Math.ceil(total / numericLimit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get single user
// @access  Private (Admin)
router.get('/:id', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        error: 'Kullanıcı bulunamadı'
      });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Admin)
router.put('/:id/role', auth, adminAuth, [
  body('role').isIn(['user', 'moderator', 'admin']).withMessage('Geçersiz rol')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        error: 'Kullanıcı bulunamadı'
      });
    }

    res.json({
      message: 'Rol güncellendi',
      user
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

router.put('/:id/status', auth, adminAuth, [
  body('status').isIn(['active', 'inactive', 'banned']).withMessage('Geçersiz durum')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { status } = req.body;
    const update = {
      status,
      isActive: status === 'active'
    };

    if (status === 'banned') {
      update.bannedAt = new Date();
    } else {
      update.bannedAt = null;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        error: 'Kullanıcı bulunamadı'
      });
    }

    res.json({
      message: 'Durum güncellendi',
      user
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

router.post('/bulk', auth, adminAuth, [
  body('userIds').isArray({ min: 1 }).withMessage('Kullanıcı listesi gerekli'),
  body('action').isIn(['activate', 'deactivate', 'ban', 'delete']).withMessage('Geçersiz işlem')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { userIds, action } = req.body;
    let result = { modified: 0, deleted: 0 };

    switch (action) {
      case 'activate':
        {
          const updateRes = await User.updateMany(
          { _id: { $in: userIds } },
          { $set: { status: 'active', isActive: true } }
        );
          result.modified = updateRes.modifiedCount || 0;
        }
        break;
      case 'deactivate':
        {
          const updateRes = await User.updateMany(
          { _id: { $in: userIds } },
          { $set: { status: 'inactive', isActive: false } }
        );
          result.modified = updateRes.modifiedCount || 0;
        }
        break;
      case 'ban':
        {
          const updateRes = await User.updateMany(
          { _id: { $in: userIds } },
          { $set: { status: 'banned', isActive: false, bannedAt: new Date() } }
        );
          result.modified = updateRes.modifiedCount || 0;
        }
        break;
      case 'delete':
        {
          const deleteRes = await User.deleteMany({ _id: { $in: userIds } });
          result.deleted = deleteRes.deletedCount || 0;
        }
        break;
      default:
        break;
    }

    res.json({
      message: 'Toplu işlem tamamlandı',
      result
    });
  } catch (error) {
    console.error('Bulk action error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

router.put('/:id', auth, adminAuth, [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('İsim 2-50 karakter arası olmalı'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Geçerli bir email girin'),
  body('role').optional().isIn(['user', 'moderator', 'admin']).withMessage('Geçersiz rol'),
  body('status').optional().isIn(['active', 'inactive', 'banned']).withMessage('Geçersiz durum'),
  body('isActive').optional().isBoolean().withMessage('Geçersiz durum')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { name, email, role, isActive, status } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (typeof status === 'string') {
      updateData.status = status;
      updateData.isActive = status === 'active';
      updateData.bannedAt = status === 'banned' ? new Date() : null;
    } else if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
      updateData.status = isActive ? 'active' : 'inactive';
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        error: 'Kullanıcı bulunamadı'
      });
    }

    res.json({
      message: 'Kullanıcı başarıyla güncellendi',
      user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Admin)
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        error: 'Kullanıcı bulunamadı'
      });
    }

    res.json({
      message: 'Kullanıcı başarıyla silindi'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

module.exports = router;
