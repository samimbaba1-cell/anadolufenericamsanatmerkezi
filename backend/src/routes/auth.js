const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const emailService = require('../../services/emailService');

const router = express.Router();

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('İsim 2-50 karakter arası olmalı'),
  body('email').isEmail().normalizeEmail().withMessage('Geçerli bir email girin'),
  body('password')
    .isLength({ min: 8 }).withMessage('Şifre en az 8 karakter olmalı')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir')
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

    // Generate email verification token
    const crypto = require('crypto');
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date();
    emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 24); // 24 saat geçerli

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      emailVerificationToken,
      emailVerified: false
    });

    // Send welcome email with verification link
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
      const verificationUrl = `${siteUrl}/verify-email?token=${emailVerificationToken}`;
      
      await emailService.sendWelcomeEmail(user, verificationUrl);
    } catch (emailError) {
      // Log but don't fail registration if email fails
      console.error('Error sending welcome email:', emailError);
    }

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'Kullanıcı başarıyla oluşturuldu. Lütfen email adresinizi kontrol edin.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: false
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   POST /api/auth/login
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

    // Find user (password is always included in Sequelize)
    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(401).json({
        error: 'Geçersiz email veya şifre'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        error: 'Hesabınız deaktif durumda'
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
    const token = generateToken(user.id);

    res.json({
      message: 'Giriş başarılı',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   GET /api/auth/profile
// @desc    Get user profile
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

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('İsim 2-50 karakter arası olmalı'),
  body('profile.phone').optional().trim().isLength({ min: 10, max: 15 }).withMessage('Telefon 10-15 karakter arası olmalı')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { name, profile } = req.body;
    const user = await User.findByPk(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'Kullanıcı bulunamadı'
      });
    }

    if (name) user.name = name;
    if (profile) {
      // Update profile fields individually
      if (profile.phone) user.profilePhone = profile.phone;
      if (profile.address) {
        if (profile.address.street) user.profileAddressStreet = profile.address.street;
        if (profile.address.city) user.profileAddressCity = profile.address.city;
        if (profile.address.state) user.profileAddressState = profile.address.state;
        if (profile.address.zipCode) user.profileAddressZipCode = profile.address.zipCode;
        if (profile.address.country) user.profileAddressCountry = profile.address.country;
      }
      if (profile.preferences) {
        if (profile.preferences.newsletter !== undefined) user.profilePreferencesNewsletter = profile.preferences.newsletter;
        if (profile.preferences.notifications !== undefined) user.profilePreferencesNotifications = profile.preferences.notifications;
      }
    }

    await user.save();
    const userJson = user.toJSON();

    res.json({
      message: 'Profil başarıyla güncellendi',
      user: {
        id: userJson.id,
        name: userJson.name,
        email: userJson.email,
        role: userJson.role,
        profile: userJson.profile
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Forgot password
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Geçerli bir email girin')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { email } = req.body;

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(404).json({
        error: 'Bu email adresi ile kayıtlı kullanıcı bulunamadı'
      });
    }

    // Generate reset token (in real app, send email)
    const resetToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // Send email with reset link
    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${resetToken}`;
      
      // Only try to send email if SMTP is configured (in test/dev, this might fail)
      await emailService.sendMail({
        to: user.email,
        subject: 'Şifre Sıfırlama - Anadolu Feneri Cam Sanat Merkezi',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Şifre Sıfırlama</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
              .content { background: #f9fafb; padding: 20px; }
              .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
              .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Anadolu Feneri Cam Sanat Merkezi</h1>
                <h2>Şifre Sıfırlama</h2>
              </div>
              
              <div class="content">
                <p>Merhaba ${user.name},</p>
                <p>Şifre sıfırlama talebiniz alınmıştır. Aşağıdaki bağlantıya tıklayarak yeni şifrenizi belirleyebilirsiniz:</p>
                
                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">Şifremi Sıfırla</a>
                </div>
                
                <p>Veya aşağıdaki bağlantıyı tarayıcınıza kopyalayıp yapıştırabilirsiniz:</p>
                <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>
                
                <div class="warning">
                  <strong>Önemli:</strong> Bu bağlantı 1 saat süreyle geçerlidir. Bağlantıyı başka biriyle paylaşmayın.
                </div>
                
                <p>Eğer bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
              </div>
              
              <div class="footer">
                <p>Anadolu Feneri Cam Sanat Merkezi - Uygun fiyatlı ürünler ve hızlı teslimat</p>
                <p>Bu e-posta otomatik olarak gönderilmiştir.</p>
              </div>
            </div>
          </body>
          </html>
        `
      });
      
      console.log(`Password reset email sent to: ${email}`);
    } catch (emailError) {
      // Don't fail the request if email fails, but log it
      // Email gönderilemese bile reset token oluşturuldu, kullanıcı token'ı manuel kullanabilir
      console.error('Error sending password reset email:', emailError.message);
      
      // In development/test, also log the token so it can be used for testing
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        console.log(`⚠️  Email gönderilemedi (SMTP yapılandırılmamış olabilir)`);
        console.log(`📧 Development/Test modu - Reset token for ${email}: ${resetToken}`);
        console.log(`🔗 Reset URL: ${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${resetToken}`);
      }
    }

    res.json({
      message: 'Şifre sıfırlama bağlantısı email adresinize gönderildi'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password
// @access  Public
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Token gerekli'),
  body('password')
    .isLength({ min: 8 }).withMessage('Şifre en az 8 karakter olmalı')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { token, password } = req.body;

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findOne({
      where: {
        id: decoded.userId,
        resetPasswordToken: token,
        resetPasswordExpires: {
          [require('sequelize').Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        error: 'Geçersiz veya süresi dolmuş token'
      });
    }

    // Update password (User model will hash it automatically via beforeSave hook)
    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({
      message: 'Şifre başarıyla sıfırlandı'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   GET /api/auth/verify-email
// @desc    Verify user email
// @access  Public
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        error: 'Doğrulama token\'ı gerekli'
      });
    }

    // Find user with this token
    const user = await User.findOne({
      where: {
        emailVerificationToken: token
      }
    });

    if (!user) {
      return res.status(400).json({
        error: 'Geçersiz veya süresi dolmuş doğrulama token\'ı'
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json({
        error: 'Email adresi zaten doğrulanmış'
      });
    }

    // Verify email
    user.emailVerified = true;
    user.emailVerificationToken = null;
    await user.save();

    res.json({
      message: 'Email adresiniz başarıyla doğrulandı!',
      verified: true
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   POST /api/auth/resend-verification
// @desc    Resend verification email
// @access  Private
router.post('/resend-verification', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'Kullanıcı bulunamadı'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        error: 'Email adresi zaten doğrulanmış'
      });
    }

    // Generate new verification token
    const crypto = require('crypto');
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = emailVerificationToken;
    await user.save();

    // Send verification email
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
      const verificationUrl = `${siteUrl}/verify-email?token=${emailVerificationToken}`;
      
      await emailService.sendWelcomeEmail(user, verificationUrl);
      
      res.json({
        message: 'Doğrulama emaili tekrar gönderildi. Lütfen email adresinizi kontrol edin.'
      });
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      res.status(500).json({
        error: 'Email gönderilirken bir hata oluştu'
      });
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

module.exports = router;
