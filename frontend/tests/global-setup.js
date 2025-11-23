const path = require('path');
const seedData = require('../../backend/scripts/seedData');

module.exports = async () => {
  process.env.BACKEND_ENV_PATH = process.env.BACKEND_ENV_PATH || path.resolve(__dirname, '../../backend/.env');
  await seedData();
};

