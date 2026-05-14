const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({
        error: 'Kullanıcı bulunamadı'
      });
    }

    const userJson = user.toJSON();
    res.json({
      user: {
        id: userJson.id,
        name: userJson.name,
        email: userJson.email,
        role: userJson.role,
        status: userJson.status,
        lastLogin: userJson.lastLogin,
        loginCount: userJson.loginCount,
        profile: userJson.profile,
        emailVerified: userJson.emailVerified,
        createdAt: userJson.createdAt
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
    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return res.status(400).json({
        error: 'Bu email adresi zaten kullanılıyor'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password
    });

    // Generate token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.status(201).json({
      message: 'Kullanıcı başarıyla oluşturuldu',
      token,
      user: {
        id: user.id,
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

    // Find user
    const user = await User.findOne({ where: { email: email.toLowerCase() } });
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
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    // Update last login and login count (non-blocking, ignore lock timeout errors)
    try {
      user.lastLogin = new Date();
      user.loginCount = (user.loginCount || 0) + 1;
      await user.save({ timeout: 5000 }); // 5 second timeout for save operation
    } catch (saveError) {
      // Ignore lock timeout errors in test/development environment
      // This prevents login failures when multiple tests run concurrently
      if (saveError.name === 'SequelizeDatabaseError' && saveError.parent?.code === 'ER_LOCK_WAIT_TIMEOUT') {
        // Log but don't fail login - statistics update is non-critical
        if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
          // Silent in test/dev to reduce noise
        }
      } else {
        // Log other save errors but still allow login
        console.warn('User statistics update failed (non-critical):', saveError.message);
      }
    }

    res.json({
      message: 'Giriş başarılı',
      token,
      user: {
        id: user.id,
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
    const where = {};

    if (search) {
      const searchTerm = search.trim();
      where[Op.or] = [
        { name: { [Op.like]: `%${searchTerm}%` } },
        { email: { [Op.like]: `%${searchTerm}%` } }
      ];
    }

    if (role && role !== 'all') {
      where.role = role;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    const { rows: users, count: total } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit: numericLimit,
      offset: (numericPage - 1) * numericLimit
    });

    res.json({
      users: users.map(u => u.toJSON()),
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
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({
        error: 'Kullanıcı bulunamadı'
      });
    }

    res.json({ user: user.toJSON() });
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
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        error: 'Kullanıcı bulunamadı'
      });
    }

    user.role = role;
    await user.save();

    res.json({
      message: 'Rol güncellendi',
      user: user.toJSON()
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
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        error: 'Kullanıcı bulunamadı'
      });
    }

    user.status = status;
    user.isActive = status === 'active';
    user.bannedAt = status === 'banned' ? new Date() : null;
    await user.save();

    res.json({
      message: 'Durum güncellendi',
      user: user.toJSON()
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

    const ids = userIds.map(id => parseInt(id)).filter(id => !isNaN(id));
    
    switch (action) {
      case 'activate':
        {
          const [count] = await User.update(
            { status: 'active', isActive: true },
            { where: { id: { [Op.in]: ids } } }
          );
          result.modified = count || 0;
        }
        break;
      case 'deactivate':
        {
          const [count] = await User.update(
            { status: 'inactive', isActive: false },
            { where: { id: { [Op.in]: ids } } }
          );
          result.modified = count || 0;
        }
        break;
      case 'ban':
        {
          const [count] = await User.update(
            { status: 'banned', isActive: false, bannedAt: new Date() },
            { where: { id: { [Op.in]: ids } } }
          );
          result.modified = count || 0;
        }
        break;
      case 'delete':
        {
          const count = await User.destroy({ where: { id: { [Op.in]: ids } } });
          result.deleted = count || 0;
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

    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        error: 'Kullanıcı bulunamadı'
      });
    }

    Object.keys(updateData).forEach(key => {
      user[key] = updateData[key];
    });
    await user.save();

    res.json({
      message: 'Kullanıcı başarıyla güncellendi',
      user: user.toJSON()
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
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        error: 'Kullanıcı bulunamadı'
      });
    }

    await user.destroy();

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
