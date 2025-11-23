const crypto = require('crypto');

const ALGORITHM = 'aes-256-ctr';
const IV_LENGTH = 16;

function getKey() {
  const secret = process.env.SETTINGS_SECRET_KEY || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('SETTINGS_SECRET_KEY environment variable is required for secure settings storage');
  }
  return crypto.createHash('sha256').update(String(secret)).digest();
}

function encrypt(value) {
  if (!value && value !== 0) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(value) {
  if (!value) return '';
  try {
    const [ivHex, dataHex] = value.split(':');
    if (!ivHex || !dataHex) return '';
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(dataHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Secret decrypt error:', error.message);
    return '';
  }
}

module.exports = {
  encrypt,
  decrypt,
};

