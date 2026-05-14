const registry = require('./registry');
const trendyolAdapter = require('./trendyolAdapter');
const hepsiburadaAdapter = require('./hepsiburadaAdapter');
const n11Adapter = require('./n11Adapter');

registry.register(trendyolAdapter);
registry.register(hepsiburadaAdapter);
registry.register(n11Adapter);

/**
 * Yeni pazaryeri: ./yeniAdapter.js oluşturup burada registry.register(require('./yeniAdapter')).
 */
module.exports = {
  getAdapter: registry.getAdapter,
  listProviders: registry.listProviders,
  register: registry.register
};
