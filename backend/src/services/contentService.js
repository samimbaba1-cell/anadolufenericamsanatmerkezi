const ContentPage = require('../models/ContentPage');
const defaults = require('../data/defaultContentTexts');

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

function fillLegalIfShort(existing = {}, fallback = {}) {
  const keys = ['privacyPolicy', 'termsOfUse', 'cookiePolicy'];
  const out = {};
  for (const key of keys) {
    const ex = existing[key] || {};
    const fb = fallback[key] || {};
    const content = (ex.content || '').trim();
    const useDefault = content.length < 120;
    out[key] = {
      ...fb,
      ...ex,
      content: useDefault ? fb.content || content : content,
      title: ex.title || fb.title,
      summary: ex.summary || fb.summary
    };
  }
  return out;
}

function enrichContent(raw = {}) {
  const about = {
    ...defaults.about,
    ...(raw.about || {}),
    companyInfo: {
      ...(defaults.about?.companyInfo || {}),
      ...(raw.about?.companyInfo || {})
    },
    values:
      Array.isArray(raw.about?.values) && raw.about.values.length > 0
        ? raw.about.values
        : defaults.about.values,
    cta: {
      ...(defaults.about?.cta || {}),
      ...(raw.about?.cta || {})
    }
  };

  const testimonials =
    Array.isArray(raw.testimonials) && raw.testimonials.length > 0
      ? raw.testimonials
      : defaults.testimonials;

  return {
    ...raw,
    about,
    testimonials,
    legal: fillLegalIfShort(raw.legal, defaults.legal)
  };
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
  const plain = doc?.get ? doc.get({ plain: true }) : doc;
  return enrichContent(plain);
}

async function updateContent(payload, adminId) {
  const doc = await loadContent(true);
  const existing = doc?.get ? doc.get({ plain: true }) : { ...doc };
  const base = enrichContent(existing);

  const next = {
    id: existing.id,
    about: {
      ...base.about,
      ...(payload.about || {}),
      companyInfo: {
        ...(base.about?.companyInfo || {}),
        ...(payload.about?.companyInfo || {})
      },
      values: Array.isArray(payload.about?.values) ? payload.about.values : base.about.values,
      cta: {
        ...(base.about?.cta || {}),
        ...(payload.about?.cta || {})
      }
    },
    contact: {
      ...base.contact,
      ...(payload.contact || {}),
      workingHours: {
        ...(base.contact?.workingHours || {}),
        ...(payload.contact?.workingHours || {})
      }
    },
    faq: Array.isArray(payload.faq) ? payload.faq : base.faq,
    testimonials: Array.isArray(payload.testimonials) ? payload.testimonials : base.testimonials,
    legal: {
      privacyPolicy: {
        ...(base.legal?.privacyPolicy || {}),
        ...(payload.legal?.privacyPolicy || {})
      },
      termsOfUse: {
        ...(base.legal?.termsOfUse || {}),
        ...(payload.legal?.termsOfUse || {})
      },
      cookiePolicy: {
        ...(base.legal?.cookiePolicy || {}),
        ...(payload.legal?.cookiePolicy || {})
      }
    },
    support: {
      customerService: {
        ...(base.support?.customerService || {}),
        ...(payload.support?.customerService || {}),
        supportHours: {
          ...(base.support?.customerService?.supportHours || {}),
          ...(payload.support?.customerService?.supportHours || {})
        }
      },
      paymentOptions: {
        ...(base.support?.paymentOptions || {}),
        ...(payload.support?.paymentOptions || {}),
        methods: Array.isArray(payload.support?.paymentOptions?.methods)
          ? normalizePaymentMethods(
              payload.support.paymentOptions.methods,
              base.support?.paymentOptions?.methods
            )
          : base.support?.paymentOptions?.methods || []
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
        testimonials: next.testimonials,
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
      testimonials: next.testimonials,
      legal: next.legal,
      support: next.support,
      updatedById: adminId
    });
  }

  cache = updated;
  cacheTime = Date.now();
  const plain = updated?.get ? updated.get({ plain: true }) : updated;
  return enrichContent(plain);
}

module.exports = {
  getContent,
  updateContent,
  loadContent
};
