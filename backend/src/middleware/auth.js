const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Auth middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Token gerekli' 
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET tanımlanmamış!');
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'Sunucu yapılandırma hatası' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Geçersiz token' 
      });
    }

    req.user = { 
      userId: user.id, 
      email: user.email, 
      role: user.role,
      name: user.name 
    };
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Geçersiz token' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Token süresi dolmuş' 
      });
    }
    res.status(401).json({ 
      error: 'Authentication failed',
      message: 'Kimlik doğrulama başarısız' 
    });
  }
};

// Admin auth middleware
const adminAuth = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Kimlik doğrulama gerekli' 
      });
    }

    const user = await User.findByPk(req.user.userId);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        message: 'Kullanıcı bulunamadı' 
      });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Admin yetkisi gerekli' 
      });
    }
    
    req.user.role = user.role; // Ensure role is set
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(403).json({ 
      error: 'Forbidden',
      message: 'Yetkilendirme hatası' 
    });
  }
};

module.exports = { auth, adminAuth };