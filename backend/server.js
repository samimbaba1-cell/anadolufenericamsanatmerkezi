const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
// Load .env FIRST before requiring database
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { sequelize, testConnection, syncDatabase } = require('./src/config/database');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const TRUST_PROXY = (() => {
  if (typeof process.env.TRUST_PROXY === 'undefined') {
    return NODE_ENV === 'production' ? 1 : false;
  }

  if (process.env.TRUST_PROXY === 'true') return true;
  if (process.env.TRUST_PROXY === 'false') return false;

  const parsed = Number.parseInt(process.env.TRUST_PROXY, 10);
  return Number.isNaN(parsed) ? process.env.TRUST_PROXY : parsed;
})();

app.disable('x-powered-by');
app.set('trust proxy', TRUST_PROXY);

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
const allowedOrigins = new Set(
  [
    process.env.FRONTEND_URL,
    ...(process.env.ADDITIONAL_ALLOWED_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    ...(NODE_ENV === 'production' ? [] : ['http://localhost:3001', 'http://localhost:3000'])
  ].filter(Boolean)
);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.has(origin) || process.env.NODE_ENV === 'development') {
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

// Localhost'tan gelen isteklerde rate limit atla (E2E, dev, aynı makineden istekler)
const isLocalOrTest = (req) => {
  const ip = (req.ip || req.connection?.remoteAddress || '').trim();
  const localIPs = ['::1', '127.0.0.1', '::ffff:127.0.0.1'];
  return localIPs.some((allowed) => ip === allowed || ip.endsWith(allowed));
};

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
  skip: (req) => isLocalOrTest(req)
});

// Stricter rate limiter for auth endpoints (E2E/test veya localhost'ta atla)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  skipSuccessfulRequests: true,
  message: {
    error: 'Too many authentication attempts',
    message: 'Çok fazla giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.'
  },
  skip: (req) => isLocalOrTest(req)
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
  
  // Sequelize/validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Doğrulama hatası',
      details: Object.values(err.errors || {}).map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }
  
  // Sequelize invalid ID / cast error
  if (err.name === 'CastError' || err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      error: 'Invalid ID',
      message: 'Geçersiz ID formatı'
    });
  }
  
  // Sequelize unique constraint (duplicate key)
  if (err.code === 11000 || err.name === 'SequelizeUniqueConstraintError') {
    const field = (err.fields && Object.keys(err.fields)[0]) || (err.keyPattern && Object.keys(err.keyPattern)[0]) || 'field';
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

// MySQL Database Connection
async function connectDatabase() {
  try {
    const connected = await testConnection();
    if (connected) {
      // Sync database schema (only in development, use migrations in production)
      if (NODE_ENV === 'development' && process.env.SYNC_DB === 'true') {
        console.log('🔄 Veritabanı şeması senkronize ediliyor...');
        await syncDatabase(false); // false = don't force drop tables
      }
      
      // Load all models to register associations
      require('./src/models');
    } else {
      console.warn('⚠️  MySQL bağlantısı başarısız. Uygulama sınırlı modda çalışacak.');
    }
  } catch (err) {
    console.error('❌ MySQL bağlantısı yapılandırılırken hata:', err.message);
    console.warn('⚠️  Veritabanı bağlantısı olmadan devam ediliyor...');
  }
}

connectDatabase();

// Server Start
app.listen(PORT, () => {
  console.log(`🚀 Server ${PORT} portunda çalışıyor`);
  console.log(`📱 Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`);
  console.log(`🔗 API: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
});

module.exports = app;