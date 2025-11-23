const { validationResult } = require('express-validator');

/**
 * Validation error handler middleware
 * Use this after express-validator validation chains
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Doğrulama hatası',
      details: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  
  next();
};

/**
 * Sanitize user input to prevent XSS
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .trim();
};

/**
 * Validate MongoDB ObjectId
 */
const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Password strength validator
 */
const isStrongPassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return regex.test(password);
};

/**
 * Email validator
 */
const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Turkish phone number validator
 */
const isValidTurkishPhone = (phone) => {
  // Formats: 05xx xxx xx xx or +90 5xx xxx xx xx
  const regex = /^(\+90|0)?5\d{9}$/;
  return regex.test(phone.replace(/\s/g, ''));
};

module.exports = {
  handleValidationErrors,
  sanitizeInput,
  isValidObjectId,
  isStrongPassword,
  isValidEmail,
  isValidTurkishPhone
};

