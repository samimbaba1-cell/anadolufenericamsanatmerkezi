const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config({ path: './.env' });

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Mongoose defaults
mongoose.set('strictQuery', false);
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 10000);

// Middleware - Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Compression
app.use(compression());

// CORS Configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3001',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body Parser with limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

// Rate Limiting
const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    message: 'Çok fazla istek gönderdiniz, lütfen daha sonra tekrar deneyin.'
  },
  skip: (req) => {
    // Skip rate limiting in development for testing
    return process.env.NODE_ENV === 'development' && req.ip === '::1';
  }
});

// Stricter rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  skipSuccessfulRequests: true,
  message: {
    error: 'Too many authentication attempts',
    message: 'Çok fazla giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.'
  }
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/products', require('./src/routes/products'));
app.use('/api/categories', require('./src/routes/categories'));
app.use('/api/brands', require('./src/routes/brands'));
app.use('/api/orders', require('./src/routes/orders'));
app.use('/api/cart', require('./src/routes/cart'));
app.use('/api/reviews', require('./src/routes/reviews'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/branding', require('./src/routes/branding'));
app.use('/api/media', require('./src/routes/media'));
app.use('/api/seo', require('./src/routes/seo'));
app.use('/api/banners', require('./src/routes/banners'));
app.use('/api/coupons', require('./src/routes/coupons'));
app.use('/api/payments', require('./src/routes/payments'));
app.use('/api/content', require('./src/routes/content'));
app.use('/api/feeds', require('./src/routes/feeds'));
app.use('/api/webhooks', require('./src/routes/webhooks'));
app.use('/api/settings', require('./src/routes/settings'));
app.use('/api/admin/inventory', require('./src/routes/inventory'));
// AI features removed - app.use('/api/ai', require('./src/routes/ai'));

// Health Check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  // Log error details (in production, use proper logging service)
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Doğrulama hatası',
      details: Object.values(err.errors).map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }
  
  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID',
      message: 'Geçersiz ID formatı'
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      error: 'Duplicate Entry',
      message: `Bu ${field} zaten kullanılıyor`,
      field
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid Token',
      message: 'Geçersiz token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token Expired',
      message: 'Token süresi dolmuş'
    });
  }
  
  // CORS error
  if (err.message === 'CORS policy violation') {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Bu kaynağa erişim izni yok'
    });
  }
  
  // Multer file upload errors
  if (err.name === 'MulterError') {
    return res.status(400).json({
      error: 'File Upload Error',
      message: err.message
    });
  }
  
  // Default error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.name || 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Bir hata oluştu, lütfen daha sonra tekrar deneyin'
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

let isConnecting = false;
let listenersRegistered = false;

async function connectDatabase(force = false) {
  if (isConnecting) {
    return;
  }

  if (!force && mongoose.connection.readyState === 1) {
    return;
  }

  isConnecting = true;

  const primaryUrl = process.env.DATABASE_URL || process.env.MONGODB_URI;
  const fallbackUrl = process.env.DATABASE_FALLBACK_URL
    || (NODE_ENV !== 'production' ? 'mongodb://127.0.0.1:27017/anadolufenericamsanatmerkezi' : null);

  const candidates = [primaryUrl, fallbackUrl].filter(Boolean);

  if (candidates.length === 0) {
    console.warn('⚠️  MongoDB bağlantısı için kullanılabilir URL bulunamadı. Lütfen .env dosyasını kontrol edin.');
    return;
  }

  for (const [index, url] of candidates.entries()) {
    const label = index === 0 ? 'PRIMARY' : 'FALLBACK';
    try {
      console.log(`🔗 MongoDB bağlantısı (${label}) deneniyor...`);
      await mongoose.connect(url, {
        serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT) || 10000,
        maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 10
      });
      console.log(`✅ MongoDB bağlantısı başarılı (${label})`);

      if (!listenersRegistered) {
        mongoose.connection.on('error', (err) => {
          console.error('❌ MongoDB bağlantı hatası:', err.message);
        });

        mongoose.connection.on('disconnected', () => {
          console.warn('⚠️  MongoDB bağlantısı koptu. Yeniden bağlanma denemesi yapılacak...');
          connectDatabase(true).catch((err) => {
            console.error('❌ MongoDB yeniden bağlantı denemesi başarısız:', err.message);
          });
        });

        listenersRegistered = true;
      }

      isConnecting = false;
      return;
    } catch (err) {
      console.error(`❌ MongoDB bağlantı hatası (${label}):`, err.message);
    }
  }

  console.warn('⚠️  Veritabanına bağlanılamadı. Uygulama sınırlı modda çalışacak.');
  isConnecting = false;
}

connectDatabase().catch((err) => {
  console.error('❌ MongoDB bağlantısı yapılandırılırken hata:', err.message);
  console.warn('⚠️  Veritabanı bağlantısı olmadan devam ediliyor...');
});

// Server Start
app.listen(PORT, () => {
  console.log(`🚀 Server ${PORT} portunda çalışıyor`);
  console.log(`📱 Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`);
  console.log(`🔗 API: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
});

module.exports = app;