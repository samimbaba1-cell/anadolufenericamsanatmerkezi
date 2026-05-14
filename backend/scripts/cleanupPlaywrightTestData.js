/**
 * Playwright (admin E2E) testlerinin veritabanına bıraktığı deneme verilerini siler.
 * Hedef: Test Ürün / Test Kategori / test+*@example.com gibi isimlendirmeler.
 *
 * Canlıda yanlışlıkla çalışmasın diye production'da sadece
 *   ALLOW_PLAYWRIGHT_CLEANUP=true
 * ile izin verilir.
 */
const path = require('path');
const dotenv = require('dotenv');
const { Op } = require('sequelize');

dotenv.config({
  path: process.env.BACKEND_ENV_PATH || path.resolve(__dirname, '..', '.env'),
});

const { sequelize, testConnection } = require('../src/config/database');
const {
  User,
  Category,
  Product,
  Order,
  Review,
  Brand,
  Banner,
  MediaFile,
  ContentPage,
} = require('../src/models');

function assertCleanupAllowed() {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }
  if (process.env.ALLOW_PLAYWRIGHT_CLEANUP === 'true') {
    return;
  }
  throw new Error(
    "Production veritabanında bu script engellendi. Bilerek çalıştırmak için ALLOW_PLAYWRIGHT_CLEANUP=true ayarlayın."
  );
}

async function cleanup() {
  assertCleanupAllowed();
  const ok = await testConnection();
  if (!ok) {
    console.error("MySQL bağlantısı başarısız");
    process.exit(1);
  }

  const t = await sequelize.transaction();
  const summary = {
    reviews: 0,
    orders: 0,
    products: 0,
    categories: 0,
    brands: 0,
    banners: 0,
    coupons: 0,
    users: 0,
  };

  try {
    const testUserEmails = { [Op.like]: "test+%@example.com" };

    const testUsers = await User.findAll({
      where: { email: testUserEmails },
      attributes: ["id"],
      transaction: t,
    });
    const testUserIds = testUsers.map((u) => u.id);

    const testProductName = {
      [Op.or]: [
        { name: { [Op.like]: "Test Ürün %" } },
        { name: { [Op.like]: "Güncellenmiş Ürün %" } },
      ],
    };
    const testProductIds = (
      await Product.findAll({
        where: testProductName,
        attributes: ["id"],
        transaction: t,
      })
    ).map((p) => p.id);

    const testCategoryName = {
      [Op.or]: [
        { name: { [Op.like]: "Test Kategori %" } },
        { name: { [Op.like]: "Güncellenmiş Kategori %" } },
      ],
    };
    const testCategoryIds = (
      await Category.findAll({
        where: testCategoryName,
        attributes: ["id"],
        transaction: t,
      })
    ).map((c) => c.id);

    const productsInTestCategories = testCategoryIds.length
      ? (
          await Product.findAll({
            where: { categoryId: { [Op.in]: testCategoryIds } },
            attributes: ["id"],
            transaction: t,
          })
        ).map((p) => p.id)
      : [];

    const allTestProductIds = [
      ...new Set([...testProductIds, ...productsInTestCategories]),
    ];

    if (allTestProductIds.length) {
      const r1 = await Review.destroy({
        where: { productId: { [Op.in]: allTestProductIds } },
        transaction: t,
      });
      summary.reviews += r1;
    }

    if (testUserIds.length) {
      const r2 = await Review.destroy({
        where: { userId: { [Op.in]: testUserIds } },
        transaction: t,
      });
      summary.reviews += r2;

      const o1 = await Order.destroy({
        where: { userId: { [Op.in]: testUserIds } },
        transaction: t,
      });
      summary.orders += o1;

      await MediaFile.update(
        { createdById: null },
        { where: { createdById: { [Op.in]: testUserIds } }, transaction: t }
      );
      await ContentPage.update(
        { updatedById: null },
        { where: { updatedById: { [Op.in]: testUserIds } }, transaction: t }
      );
    }

    if (allTestProductIds.length) {
      const p1 = await Product.destroy({
        where: { id: { [Op.in]: allTestProductIds } },
        transaction: t,
      });
      summary.products += p1;
    }

    if (testCategoryIds.length) {
      const c1 = await Category.destroy({
        where: { id: { [Op.in]: testCategoryIds } },
        transaction: t,
      });
      summary.categories += c1;
    }

    const b1 = await Brand.destroy({
      where: {
        [Op.or]: [
          { name: { [Op.like]: "Test Marka %" } },
          { name: { [Op.like]: "Güncellenmiş Marka %" } },
        ],
      },
      transaction: t,
    });
    summary.brands += b1;

    const ban1 = await Banner.destroy({
      where: {
        [Op.or]: [
          { title: { [Op.like]: "Test Banner %" } },
          { title: { [Op.like]: "Güncellenmiş Banner %" } },
        ],
      },
      transaction: t,
    });
    summary.banners += ban1;

    // Kupon: TEST<timestamp> (Playwright admin e2e; gerçek kuponlarda "TEST"+kısa string kullanmayın)
    const [coh] = await sequelize.query(
      `DELETE FROM coupons WHERE code REGEXP '^TEST[0-9]+$'`,
      { transaction: t }
    );
    summary.coupons = (coh && coh.affectedRows) || 0;

    if (testUserIds.length) {
      const u1 = await User.destroy({
        where: { id: { [Op.in]: testUserIds } },
        transaction: t,
      });
      summary.users += u1;
    }

    await t.commit();
    console.log("Playwright / E2E deneme verileri temizlendi:", summary);
  } catch (e) {
    await t.rollback();
    throw e;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  cleanup().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { cleanup };
