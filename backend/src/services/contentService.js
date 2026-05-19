const ContentPage = require('../models/ContentPage');

let cache = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 1000;

function slugify(value = '') {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizePaymentMethods(methods = [], fallback = []) {
  const base = Array.isArray(methods) ? methods : [];

  return base
    .map((method, index) => {
      if (!method || typeof method !== 'object') {
        return null;
      }
      const name = (method.name || '').trim();
      if (!name) {
        return null;
      }

      const fallbackMethod = fallback[index] || {};
      const key = method.key?.trim() || fallbackMethod.key || slugify(name);

      return {
        key,
        name,
        description: (method.description ?? fallbackMethod.description ?? '').toString(),
        details: (method.details ?? fallbackMethod.details ?? '').toString(),
        enabled: typeof method.enabled === 'boolean' ? method.enabled : Boolean(fallbackMethod.enabled ?? true)
      };
    })
    .filter(Boolean);
}

async function loadContent(force = false) {
  const now = Date.now();
  if (!force && cache && now - cacheTime < CACHE_TTL) {
    return cache;
  }

  let doc = await ContentPage.getSingleton();
  if (!doc) {
    doc = await ContentPage.create({});
  }

  cache = doc;
  cacheTime = now;
  return cache;
}

async function getContent(options = {}) {
  const doc = await loadContent(options.force);
  return doc?.get ? doc.get({ plain: true }) : doc;
}

async function updateContent(payload, adminId) {
  const doc = await loadContent();
  const existing = doc?.get ? doc.get({ plain: true }) : { ...doc };

  const next = {
    id: existing.id,
    about: {
      ...existing.about,
      ...(payload.about || {}),
      companyInfo: {
        ...(existing.about?.companyInfo || {}),
        ...(payload.about?.companyInfo || {})
      }
    },
    contact: {
      ...existing.contact,
      ...(payload.contact || {}),
      workingHours: {
        ...(existing.contact?.workingHours || {}),
        ...(payload.contact?.workingHours || {})
      }
    },
    faq: Array.isArray(payload.faq) ? payload.faq : existing.faq,
    legal: {
      privacyPolicy: {
        ...(existing.legal?.privacyPolicy || {}),
        ...(payload.legal?.privacyPolicy || {})
      },
      termsOfUse: {
        ...(existing.legal?.termsOfUse || {}),
        ...(payload.legal?.termsOfUse || {})
      },
      cookiePolicy: {
        ...(existing.legal?.cookiePolicy || {}),
        ...(payload.legal?.cookiePolicy || {})
      }
    },
    support: {
      customerService: {
        ...(existing.support?.customerService || {}),
        ...(payload.support?.customerService || {}),
        supportHours: {
          ...(existing.support?.customerService?.supportHours || {}),
          ...(payload.support?.customerService?.supportHours || {})
        }
      },
      paymentOptions: {
        ...(existing.support?.paymentOptions || {}),
        ...(payload.support?.paymentOptions || {}),
        methods: Array.isArray(payload.support?.paymentOptions?.methods)
          ? normalizePaymentMethods(
              payload.support.paymentOptions.methods,
              existing.support?.paymentOptions?.methods
            )
          : existing.support?.paymentOptions?.methods || []
      }
    },
    updatedById: adminId
  };

  const now = new Date();
  if (payload.legal?.privacyPolicy) {
    next.legal.privacyPolicy.lastUpdated = now;
  }
  if (payload.legal?.termsOfUse) {
    next.legal.termsOfUse.lastUpdated = now;
  }
  if (payload.legal?.cookiePolicy) {
    next.legal.cookiePolicy.lastUpdated = now;
  }

  let updated;
  if (existing.id) {
    await ContentPage.update(
      {
        about: next.about,
        contact: next.contact,
        faq: next.faq,
        legal: next.legal,
        support: next.support,
        updatedById: adminId
      },
      { where: { id: existing.id } }
    );
    updated = await ContentPage.findByPk(existing.id);
  } else {
    updated = await ContentPage.create({
      about: next.about,
      contact: next.contact,
      faq: next.faq,
      legal: next.legal,
      support: next.support,
      updatedById: adminId
    });
  }

  cache = updated;
  cacheTime = Date.now();
  return updated?.get ? updated.get({ plain: true }) : updated;
}

module.exports = {
  getContent,
  updateContent,
  loadContent
};

