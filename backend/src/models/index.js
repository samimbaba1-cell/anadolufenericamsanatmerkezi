const { sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Category = require('./Category');
const Product = require('./Product');
const Order = require('./Order');
const Brand = require('./Brand');
const Coupon = require('./Coupon');
const Banner = require('./Banner');
const Review = require('./Review');
const SiteSettings = require('./SiteSettings');
const ContentPage = require('./ContentPage');
const MediaFile = require('./MediaFile');
const SeoSettings = require('./SeoSettings');
const MarketplaceConfig = require('./MarketplaceConfig');
const MarketplaceMapping = require('./MarketplaceMapping');
const MarketplacePushLog = require('./MarketplacePushLog');
const FeedStats = require('./FeedStats');

// Define associations
// User associations
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
User.hasMany(Review, { foreignKey: 'userId', as: 'reviews' });
User.hasMany(MediaFile, { foreignKey: 'createdById', as: 'mediaFiles' });

// Category associations
Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });
Category.belongsTo(Category, { foreignKey: 'parentId', as: 'parent' });
Category.hasMany(Category, { foreignKey: 'parentId', as: 'children' });

// Product associations
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
Product.belongsTo(Brand, { foreignKey: 'brandRefId', as: 'brandRef' });
Product.hasMany(Review, { foreignKey: 'productId', as: 'reviews' });

// Order associations
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Review associations
Review.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Review.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// Brand associations
Brand.hasMany(Product, { foreignKey: 'brandRefId', as: 'products' });

// MediaFile associations
MediaFile.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });

// MarketplacePushLog associations
MarketplacePushLog.belongsTo(User, { foreignKey: 'triggeredById', as: 'triggeredBy' });

module.exports = {
  sequelize,
  User,
  Category,
  Product,
  Order,
  Brand,
  Coupon,
  Banner,
  Review,
  SiteSettings,
  ContentPage,
  MediaFile,
  SeoSettings,
  MarketplaceConfig,
  MarketplaceMapping,
  MarketplacePushLog,
  FeedStats
};

