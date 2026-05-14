const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'İsim gerekli' },
      len: { args: [1, 50], msg: 'İsim 50 karakterden fazla olamaz' }
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: { msg: 'Geçerli bir email girin' },
      notEmpty: { msg: 'Email gerekli' }
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: { args: [6, 255], msg: 'Şifre en az 6 karakter olmalı' }
    }
  },
  role: {
    type: DataTypes.ENUM('user', 'moderator', 'admin'),
    defaultValue: 'user'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'banned'),
    defaultValue: 'active'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  loginCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  bannedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Profile as JSON field (MySQL 5.7+ supports JSON)
  profilePhone: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'profile_phone'
  },
  profileAddressStreet: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'profile_address_street'
  },
  profileAddressCity: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'profile_address_city'
  },
  profileAddressState: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'profile_address_state'
  },
  profileAddressZipCode: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'profile_address_zip_code'
  },
  profileAddressCountry: {
    type: DataTypes.STRING(100),
    defaultValue: 'Turkey',
    field: 'profile_address_country'
  },
  profilePreferencesNewsletter: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'profile_preferences_newsletter'
  },
  profilePreferencesNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'profile_preferences_notifications'
  },
  resetPasswordToken: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  resetPasswordExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  emailVerificationToken: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: false,
  indexes: [
    { fields: ['email'], unique: true },
    { fields: ['role'] },
    { fields: ['status'] },
    { fields: ['createdAt'] }
  ],
  hooks: {
    beforeSave: async (user) => {
      // Password hash
      if (user.changed('password')) {
        const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const salt = await bcrypt.genSalt(rounds);
        user.password = await bcrypt.hash(user.password, salt);
      }
      
      // Sync status and isActive
      if (user.changed('status')) {
        user.isActive = user.status === 'active';
      } else if (user.changed('isActive')) {
        user.status = user.isActive ? 'active' : 'inactive';
      }
      
      // Lowercase email
      if (user.changed('email')) {
        user.email = user.email.toLowerCase().trim();
      }
    }
  }
});

// Instance methods
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

User.prototype.toJSON = function() {
  const user = { ...this.get() };
  delete user.password;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpires;
  delete user.emailVerificationToken;
  
  // Reconstruct profile object for backward compatibility
  user.profile = {
    phone: user.profilePhone,
    address: {
      street: user.profileAddressStreet,
      city: user.profileAddressCity,
      state: user.profileAddressState,
      zipCode: user.profileAddressZipCode,
      country: user.profileAddressCountry
    },
    preferences: {
      newsletter: user.profilePreferencesNewsletter,
      notifications: user.profilePreferencesNotifications
    }
  };
  
  delete user.profilePhone;
  delete user.profileAddressStreet;
  delete user.profileAddressCity;
  delete user.profileAddressState;
  delete user.profileAddressZipCode;
  delete user.profileAddressCountry;
  delete user.profilePreferencesNewsletter;
  delete user.profilePreferencesNotifications;
  
  return user;
};

module.exports = User;
