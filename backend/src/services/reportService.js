const { sequelize, Sequelize } = require('../config/database');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

const EXCLUDED_STATUSES = ['cancelled', 'refunded'];

function resolveRange(range) {
  const endDate = new Date();
  endDate.setMilliseconds(0);
  const now = endDate;

  let startDate;
  switch (range) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
  }

  const periodLength = now.getTime() - startDate.getTime();
  const previousEndDate = new Date(startDate.getTime());
  const previousStartDate = new Date(startDate.getTime() - periodLength);

  return {
    startDate,
    endDate: now,
    previousStartDate,
    previousEndDate,
    periodLength
  };
}

async function getSalesSummary(range = '30d') {
  const { startDate, endDate, previousStartDate, previousEndDate } = resolveRange(range);
  const matchCurrent = {
    createdAt: { [Sequelize.Op.between]: [startDate, endDate] },
    status: { [Sequelize.Op.notIn]: EXCLUDED_STATUSES }
  };

  const matchPrevious = {
    createdAt: { [Sequelize.Op.between]: [previousStartDate, previousEndDate] },
    status: { [Sequelize.Op.notIn]: EXCLUDED_STATUSES }
  };

  const [currentSummary] = await Order.findAll({
    where: matchCurrent,
    attributes: [
      [sequelize.fn('SUM', sequelize.col('total')), 'revenue'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'orders']
    ],
    raw: true
  });

  const [previousSummary] = await Order.findAll({
    where: matchPrevious,
    attributes: [
      [sequelize.fn('SUM', sequelize.col('total')), 'revenue'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'orders']
    ],
    raw: true
  });

  const totalRevenue = Number(currentSummary?.revenue) || 0;
  const totalOrders = Number(currentSummary?.orders) || 0;
  const previousRevenue = Number(previousSummary?.revenue) || 0;

  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const growth = previousRevenue > 0
    ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
    : (totalRevenue > 0 ? 100 : 0);

  const timeline = await Order.findAll({
    where: matchCurrent,
    attributes: [
      [sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m-%d'), 'date'],
      [sequelize.fn('SUM', sequelize.col('total')), 'revenue'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'orders']
    ],
    group: [sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m-%d')],
    order: [[sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m-%d'), 'ASC']],
    raw: true
  });

  const marketplaces = await Order.findAll({
    where: matchCurrent,
    attributes: [
      'source',
      [sequelize.fn('SUM', sequelize.col('total')), 'revenue'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'orders']
    ],
    group: ['source'],
    order: [[sequelize.fn('SUM', sequelize.col('total')), 'DESC']],
    raw: true
  });

  return {
    sales: {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      growth,
      previousRevenue,
      timeline: timeline.map((item) => ({
        date: item.date,
        revenue: Number(item.revenue) || 0,
        orders: Number(item.orders) || 0
      })),
      marketplaces: marketplaces.map((item) => ({
        source: item.source || 'website',
        revenue: Number(item.revenue) || 0,
        orders: Number(item.orders) || 0
      }))
    }
  };
}

async function getProductInsights(range = '30d') {
  const { startDate, endDate } = resolveRange(range);
  const match = {
    createdAt: { [Sequelize.Op.between]: [startDate, endDate] },
    status: { [Sequelize.Op.notIn]: EXCLUDED_STATUSES }
  };

  // Top selling products using raw SQL for JSON unwinding
  const topSellingQuery = `
    SELECT 
      JSON_UNQUOTE(JSON_EXTRACT(items, CONCAT('$[', idx, '].product'))) as productId,
      SUM(JSON_UNQUOTE(JSON_EXTRACT(items, CONCAT('$[', idx, '].quantity')))) as totalQuantity,
      SUM(JSON_UNQUOTE(JSON_EXTRACT(items, CONCAT('$[', idx, '].total')))) as totalRevenue
    FROM orders
    CROSS JOIN (
      SELECT 0 as idx UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
      UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
    ) as indices
    WHERE createdAt >= :startDate AND createdAt <= :endDate
      AND status NOT IN ('cancelled', 'refunded')
      AND JSON_EXTRACT(items, CONCAT('$[', idx, ']')) IS NOT NULL
    GROUP BY productId
    ORDER BY totalRevenue DESC
    LIMIT 10
  `;

  const topSellingRaw = await sequelize.query(topSellingQuery, {
    replacements: { startDate, endDate },
    type: Sequelize.QueryTypes.SELECT
  });

  const productIds = topSellingRaw.map(p => p.productId).filter(Boolean);
  const products = await Product.findAll({
    where: { id: productIds },
    attributes: ['id', 'name', 'sku']
  });

  const productMap = {};
  products.forEach(p => {
    productMap[p.id] = p;
  });

  const topSelling = topSellingRaw.map(item => {
    const product = productMap[item.productId];
    return {
      productId: item.productId,
      name: product?.name || 'Silinmiş Ürün',
      sku: product?.sku || null,
      sales: Number(item.totalQuantity) || 0,
      revenue: Number(item.totalRevenue) || 0
    };
  });

  // Low stock products
  const lowStock = await Product.findAll({
    where: {
      isActive: true,
      minStock: { [Sequelize.Op.gt]: 0 },
      stock: { [Sequelize.Op.gt]: 0 },
      [Sequelize.Op.and]: [
        sequelize.literal('stock <= min_stock')
      ]
    },
    order: [['stock', 'ASC']],
    limit: 10,
    attributes: ['id', 'name', 'stock', [sequelize.col('min_stock'), 'minStock']]
  });

  // Out of stock products
  const outOfStock = await Product.findAll({
    where: {
      isActive: true,
      stock: { [Sequelize.Op.lte]: 0 }
    },
    order: [['updatedAt', 'ASC']],
    limit: 10,
    attributes: ['id', 'name', 'stock', [sequelize.col('min_stock'), 'minStock']]
  });

  return {
    products: {
      topSelling: topSelling.map(item => ({
        productId: item.productId,
        name: item.name,
        sku: item.sku,
        sales: item.sales,
        revenue: item.revenue
      })),
      lowStock: lowStock.map(item => ({
        productId: item.id,
        name: item.name,
        stock: item.stock,
        minStock: item.minStock
      })),
      outOfStock: outOfStock.map(item => ({
        productId: item.id,
        name: item.name,
        stock: item.stock,
        minStock: item.minStock
      }))
    }
  };
}

async function getCustomerInsights(range = '30d') {
  const { startDate, endDate } = resolveRange(range);

  const customerOrders = await Order.findAll({
    where: {
      userId: { [Sequelize.Op.ne]: null },
      status: { [Sequelize.Op.notIn]: EXCLUDED_STATUSES },
      createdAt: { [Sequelize.Op.lte]: endDate }
    },
    attributes: [
      'userId',
      [sequelize.fn('MIN', sequelize.col('createdAt')), 'firstOrder'],
      [sequelize.fn('MAX', sequelize.col('createdAt')), 'lastOrder'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalOrders']
    ],
    group: ['userId'],
    raw: true
  });

  const activeCustomers = customerOrders.filter(
    (customer) => new Date(customer.lastOrder) >= startDate && new Date(customer.lastOrder) <= endDate
  );
  const newCustomers = activeCustomers.filter(
    (customer) => new Date(customer.firstOrder) >= startDate
  );
  const returningCustomers = activeCustomers.length - newCustomers.length;

  const totalCustomers = await User.count({ where: { role: { [Sequelize.Op.ne]: 'admin' } } });

  return {
    customers: {
      totalCustomers,
      activeCustomers: activeCustomers.length,
      newCustomers: newCustomers.length,
      returningCustomers: returningCustomers > 0 ? returningCustomers : 0
    }
  };
}

async function getReports({ range = '30d' } = {}) {
  const [sales, products, customers] = await Promise.all([
    getSalesSummary(range),
    getProductInsights(range),
    getCustomerInsights(range)
  ]);

  return {
    range,
    generatedAt: new Date(),
    ...sales,
    ...products,
    ...customers
  };
}

module.exports = {
  getReports,
  resolveRange,
  getSalesSummary,
  getProductInsights,
  getCustomerInsights
};
