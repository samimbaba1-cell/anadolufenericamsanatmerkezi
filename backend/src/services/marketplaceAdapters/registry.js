/**
 * Ortak pazaryeri push: register({ id, label, push }) ile yeni kanal eklenir.
 */

const adapters = new Map();

function register(adapter) {
  if (!adapter || typeof adapter.id !== 'string' || !adapter.id.trim()) {
    throw new Error('Marketplace adapter: id zorunlu');
  }
  if (typeof adapter.push !== 'function') {
    throw new Error(`Marketplace adapter "${adapter.id}": push() zorunlu`);
  }
  const id = adapter.id.trim().toLowerCase();
  adapters.set(id, { ...adapter, id });
}

function getAdapter(marketplaceId) {
  if (!marketplaceId) return null;
  return adapters.get(String(marketplaceId).trim().toLowerCase()) || null;
}

function listProviders() {
  return [...adapters.values()].map(({ id, label }) => ({
    id,
    label: label || id
  }));
}

module.exports = {
  register,
  getAdapter,
  listProviders
};
