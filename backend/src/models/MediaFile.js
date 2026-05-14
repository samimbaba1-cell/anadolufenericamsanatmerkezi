const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MediaFile = sequelize.define('MediaFile', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  originalName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'original_name'
  },
  filename: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  url: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  mimetype: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('image', 'video', 'document', 'other'),
    defaultValue: 'other'
  },
  // Tags as JSON array
  tags: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'created_by_id'
  },
  hash: {
    type: DataTypes.STRING(64),
    allowNull: true
  }
}, {
  tableName: 'media_files',
  timestamps: true,
  underscored: false,
  indexes: [
    { fields: ['createdAt'] },
    { fields: ['type', 'createdAt'] },
    { fields: ['hash'] }
  ]
});

module.exports = MediaFile;
