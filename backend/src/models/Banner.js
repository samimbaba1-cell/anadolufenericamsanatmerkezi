const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Banner = sequelize.define('Banner', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(120),
    allowNull: false,
    defaultValue: '',
    validate: {
      len: { args: [0, 120], msg: 'Başlık 120 karakterden uzun olamaz' }
    }
  },
  subtitle: {
    type: DataTypes.STRING(160),
    allowNull: true,
    validate: {
      len: { args: [0, 160], msg: 'Alt başlık 160 karakterden uzun olamaz' }
    }
  },
  description: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      len: { args: [0, 500], msg: 'Açıklama 500 karakterden uzun olamaz' }
    }
  },
  image: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  mobileImage: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'mobile_image'
  },
  link: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  buttonText: {
    type: DataTypes.STRING(50),
    defaultValue: 'Detay',
    field: 'button_text'
  },
  type: {
    type: DataTypes.STRING(50),
    defaultValue: 'hero'
  },
  position: {
    type: DataTypes.STRING(50),
    defaultValue: 'top'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'start_date'
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'end_date'
  },
  targetAudience: {
    type: DataTypes.STRING(50),
    defaultValue: 'all',
    field: 'target_audience'
  },
  backgroundColor: {
    type: DataTypes.STRING(20),
    defaultValue: '#3B82F6',
    field: 'background_color'
  },
  textColor: {
    type: DataTypes.STRING(20),
    defaultValue: '#FFFFFF',
    field: 'text_color'
  }
}, {
  tableName: 'banners',
  timestamps: true,
  underscored: false,
  indexes: [
    { fields: ['position', 'order'] },
    { fields: ['is_active', 'start_date', 'end_date'] }
  ]
});

module.exports = Banner;
