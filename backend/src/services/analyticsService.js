const { sequelize, Sequelize } = require('../config/database');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');

const EXCLUDED_STATUSES = ['cancelled', 'refunded'];

function resolveRange(range = '7d') {
  const endDate = new Date();
  const now = new Date(endDate);
  let startDate;

  switch (range) {
    case '1d':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '7d':
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
  }

  const periodLength = endDate.getTime() - startDate.getTime();
  const previousEnd = new Date(startDate.getTime());
  const previousStart = new Date(startDate.getTime() - periodLength);

  return {
    range,
    startDate,
    endDate,
    previousStart,
    previousEnd,
    periodLength
  };
}

function formatPercentage(value) {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 10) / 10;
}

async function getSummaryMetrics(matchCurrent, matchPrevious, rangeMatch) {
  const [currentAgg, previousAgg, statusAgg] = await Promise.all([
    Order.findAll({
      where: matchCurrent,
      attributes: [
        [sequelize.fn('SUM', sequelize.col('total')), 'totalRevenue'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalOrders'],
        [sequelize.fn('AVG', sequelize.col('total')), 'avgOrderValue']
      ],
      raw: true
    }),
    Order.findAll({
      where: matchPrevious,
      attributes: [
        [sequelize.fn('SUM', sequelize.col('total')), 'totalRevenue'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalOrders'],
        [sequelize.fn('AVG', sequelize.col('total')), 'avgOrderValue']
      ],
      raw: true
    }),
    Order.findAll({
      where: rangeMatch,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total']
      ],
      group: ['status'],
      raw: true
    })
  ]);

  const summary = currentAgg[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 };
  const prev = previousAgg[0] || { totalRevenue: 0, totalOrders: 0 };

  const revenueChange = prev.totalRevenue > 0
    ? ((summary.totalRevenue - prev.totalRevenue) / prev.totalRevenue) * 100
    : (summary.totalRevenue > 0 ? 100 : 0);

  const ordersChange = prev.totalOrders > 0
    ? ((summary.totalOrders - prev.totalOrders) / prev.totalOrders) * 100
    : (summary.totalOrders > 0 ? 100 : 0);

  const totalOrders = Number(summary.totalOrders) || 0;
  const cancelled = statusAgg.find((item) => item.status === 'cancelled')?.total || 0;
  const refunded = statusAgg.find((item) => item.status === 'refunded')?.total || 0;
  const cancellationRate = totalOrders > 0 ? ((Number(cancelled) + Number(refunded)) / totalOrders) * 100 : 0;

  return {
    totalRevenue: Number(summary.totalRevenue) || 0,
    totalOrders,
    avgOrderValue: Number(summary.avgOrderValue) || 0,
    revenueChange: formatPercentage(revenueChange),
    ordersChange: formatPercentage(ordersChange),
    cancellationRate: formatPercentage(cancellationRate)
  };
}

async function getCustomerMetrics(rangeInfo) {
  const { startDate, endDate, previousStart, previousEnd } = rangeInfo;

  const [totalCustomers, newCustomers, previousCustomers, ordersByUser] = await Promise.all([
    User.count({ where: { role: { [Sequelize.Op.ne]: 'admin' } } }),
    User.count({
      where: {
        role: { [Sequelize.Op.ne]: 'admin' },
        createdAt: { [Sequelize.Op.between]: [startDate, endDate] }
      }
    }),
    User.count({
      where: {
        role: { [Sequelize.Op.ne]: 'admin' },
        createdAt: { [Sequelize.Op.between]: [previousStart, previousEnd] }
      }
    }),
    Order.findAll({
      where: {
        userId: { [Sequelize.Op.ne]: null },
        status: { [Sequelize.Op.notIn]: EXCLUDED_STATUSES },
        createdAt: { [Sequelize.Op.lte]: endDate }
      },
      attributes: [
        'userId',
        [sequelize.fn('MIN', sequelize.col('createdAt')), 'firstOrder'],
        [sequelize.fn('MAX', sequelize.col('createdAt')), 'lastOrder'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'orderCount']
      ],
      group: ['userId'],
      raw: true
    })
  ]);

  const activeInRange = ordersByUser.filter(
    (item) => new Date(item.lastOrder) >= startDate && new Date(item.lastOrder) <= endDate
  );

  const newCustomerOrders = activeInRange.filter((item) => new Date(item.firstOrder) >= startDate);
  const returningCustomerOrders = activeInRange.length - newCustomerOrders.length;
  const repeatRate = activeInRange.length > 0
    ? (returningCustomerOrders / activeInRange.length) * 100
    : 0;

  const customerGrowth = previousCustomers > 0
    ? ((newCustomers - previousCustomers) / previousCustomers) * 100
    : (newCustomers > 0 ? 100 : 0);

  return {
    totalCustomers,
    newCustomers,
    returningCustomers: Math.max(returningCustomerOrders, 0),
    activeCustomers: activeInRange.length,
    repeatRate: formatPercentage(repeatRate),
    customerGrowth: formatPercentage(customerGrowth)
  };
}

async function getTimeline(matchCurrent) {
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

  return timeline.map((item) => ({
    date: item.date,
    revenue: Number(item.revenue) || 0,
    orders: Number(item.orders) || 0
  }));
}

async function getTrafficBreakdown(matchAll) {
  const [sources, paymentMethods, status] = await Promise.all([
    Order.findAll({
      where: matchAll,
      attributes: [
        'source',
        [sequelize.fn('COUNT', sequelize.col('id')), 'orders'],
        [sequelize.fn('SUM', sequelize.col('total')), 'revenue']
      ],
      group: ['source'],
      order: [[sequelize.fn('SUM', sequelize.col('total')), 'DESC']],
      raw: true
    }),
    Order.findAll({
      where: matchAll,
      attributes: [
        'paymentMethod',
        [sequelize.fn('COUNT', sequelize.col('id')), 'orders'],
        [sequelize.fn('SUM', sequelize.col('total')), 'revenue']
      ],
      group: ['paymentMethod'],
      order: [[sequelize.fn('SUM', sequelize.col('total')), 'DESC']],
      raw: true
    }),
    Order.findAll({
      where: matchAll,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'orders'],
        [sequelize.fn('SUM', sequelize.col('total')), 'revenue']
      ],
      group: ['status'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      raw: true
    })
  ]);

  const totalOrders = sources.reduce((sum, item) => sum + Number(item.orders), 0);

  const mapBreakdown = (item) => ({
    name: item.source || item.paymentMethod || item.status || 'Diğer',
    orders: Number(item.orders) || 0,
    revenue: Number(item.revenue) || 0,
    percentage: totalOrders > 0 ? formatPercentage((Number(item.orders) / totalOrders) * 100) : 0
  });

  return {
    sources: sources.map(mapBreakdown),
    paymentMethods: paymentMethods.map(mapBreakdown),
    statuses: status.map(mapBreakdown)
  };
}

async function getProductMetrics(matchCurrent) {
  // For product metrics, we need to unwind JSON items array
  // This is complex in Sequelize, so we'll use raw SQL
  // Extract startDate and endDate from matchCurrent.createdAt[Op.between]
  const startDate = matchCurrent.createdAt?.[Sequelize.Op.between]?.[0] || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = matchCurrent.createdAt?.[Sequelize.Op.between]?.[1] || new Date();
  
  const topProductsQuery = `
    SELECT 
      JSON_UNQUOTE(JSON_EXTRACT(items, CONCAT('$[', idx, '].product'))) as productId,
      SUM(JSON_UNQUOTE(JSON_EXTRACT(items, CONCAT('$[', idx, '].total')))) as revenue,
      SUM(JSON_UNQUOTE(JSON_EXTRACT(items, CONCAT('$[', idx, '].quantity')))) as quantity,
      COUNT(*) as orders
    FROM orders
    CROSS JOIN (
      SELECT 0 as idx UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
      UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
    ) as indices
    WHERE createdAt >= :startDate AND createdAt <= :endDate
      AND status NOT IN ('cancelled', 'refunded')
      AND JSON_EXTRACT(items, CONCAT('$[', idx, ']')) IS NOT NULL
    GROUP BY productId
    ORDER BY revenue DESC
    LIMIT 10
  `;

  const topProductsRaw = await sequelize.query(topProductsQuery, {
    replacements: {
      startDate,
      endDate
    },
    type: Sequelize.QueryTypes.SELECT
  });

  // Get product details
  const productIds = topProductsRaw.map(p => p.productId).filter(Boolean);
  const products = await Product.findAll({
    where: { id: productIds },
    attributes: ['id', 'name', 'sku', 'stock']
  });

  const productMap = {};
  products.forEach(p => {
    productMap[p.id] = p;
  });

  const topProducts = topProductsRaw.map(item => {
    const product = productMap[item.productId];
    return {
      productId: item.productId,
      name: product?.name || 'Silinmiş Ürün',
      sku: product?.sku || null,
      stock: product?.stock || 0,
      revenue: Number(item.revenue) || 0,
      quantity: Number(item.quantity) || 0,
      orders: Number(item.orders) || 0
    };
  });

  // Top categories - similar approach
  // Extract startDate and endDate from matchCurrent.createdAt[Op.between]
  const categoryStartDate = matchCurrent.createdAt?.[Sequelize.Op.between]?.[0] || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const categoryEndDate = matchCurrent.createdAt?.[Sequelize.Op.between]?.[1] || new Date();
  
  const topCategoriesQuery = `
    SELECT 
      c.name as category,
      SUM(JSON_UNQUOTE(JSON_EXTRACT(o.items, CONCAT('$[', idx, '].total')))) as revenue,
      SUM(JSON_UNQUOTE(JSON_EXTRACT(o.items, CONCAT('$[', idx, '].quantity')))) as quantity
    FROM orders o
    CROSS JOIN (
      SELECT 0 as idx UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
      UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
    ) as indices
    LEFT JOIN products p ON JSON_UNQUOTE(JSON_EXTRACT(o.items, CONCAT('$[', idx, '].product'))) = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE o.createdAt >= :startDate AND o.createdAt <= :endDate
      AND o.status NOT IN ('cancelled', 'refunded')
      AND JSON_EXTRACT(o.items, CONCAT('$[', idx, ']')) IS NOT NULL
    GROUP BY c.name
    ORDER BY revenue DESC
    LIMIT 10
  `;

  const topCategoriesRaw = await sequelize.query(topCategoriesQuery, {
    replacements: {
      startDate: categoryStartDate,
      endDate: categoryEndDate
    },
    type: Sequelize.QueryTypes.SELECT
  });

  const topCategories = topCategoriesRaw.map(item => ({
    category: item.category || 'Kategori yok',
    revenue: Number(item.revenue) || 0,
    quantity: Number(item.quantity) || 0
  }));

  return {
    topProducts,
    topCategories
  };
}

async function getInventoryMetrics() {
  const [
    totalProducts,
    activeProducts,
    lowStock,
    outOfStock,
    lowStockCount,
    outOfStockCount
  ] = await Promise.all([
    Product.count(),
    Product.count({ where: { isActive: true } }),
    Product.findAll({
      where: {
        isActive: true,
        min_stock: { [Sequelize.Op.gt]: 0 },
        stock: { [Sequelize.Op.gt]: 0 },
        [Sequelize.Op.and]: [
          sequelize.literal('`Product`.`stock` <= `Product`.`min_stock`')
        ]
      },
      order: [['stock', 'ASC']],
      limit: 10,
      attributes: ['id', 'name', 'sku', 'stock', [sequelize.col('min_stock'), 'minStock']]
    }),
    Product.findAll({
      where: {
        isActive: true,
        stock: { [Sequelize.Op.lte]: 0 }
      },
      order: [['updatedAt', 'DESC']],
      limit: 10,
      attributes: ['id', 'name', 'sku', 'stock', [sequelize.col('min_stock'), 'minStock']]
    }),
    Product.count({
      where: {
        isActive: true,
        min_stock: { [Sequelize.Op.gt]: 0 },
        stock: { [Sequelize.Op.gt]: 0 },
        [Sequelize.Op.and]: [
          sequelize.literal('`Product`.`stock` <= `Product`.`min_stock`')
        ]
      }
    }),
    Product.count({
      where: {
        isActive: true,
        stock: { [Sequelize.Op.lte]: 0 }
      }
    })
  ]);

  return {
    overview: {
      totalProducts,
      activeProducts,
      lowStockCount,
      outOfStockCount
    },
    lowStock: lowStock.map((item) => ({
      productId: item.id,
      name: item.name,
      sku: item.sku,
      stock: item.stock,
      minStock: item.minStock
    })),
    outOfStock: outOfStock.map((item) => ({
      productId: item.id,
      name: item.name,
      sku: item.sku,
      stock: item.stock,
      minStock: item.minStock
    }))
  };
}

async function getRecentOrders(rangeInfo) {
  const recentOrders = await Order.findAll({
    order: [['createdAt', 'DESC']],
    limit: 10,
    attributes: ['id', 'orderNumber', 'total', 'status', 'source', 'paymentMethod', 'createdAt']
  });

  const activeSince = new Date(Date.now() - 15 * 60 * 1000);
  const activeOrders = await Order.count({
    where: {
      createdAt: { [Sequelize.Op.gte]: activeSince }
    }
  });

  return {
    activeOrders,
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      total: order.total,
      status: order.status,
      source: order.source,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt
    }))
  };
}

async function getAnalytics({ range = '7d' } = {}) {
  const rangeInfo = resolveRange(range);
  const { startDate, endDate, previousStart, previousEnd } = rangeInfo;

  const rangeMatch = {
    createdAt: { [Sequelize.Op.between]: [startDate, endDate] }
  };

  const matchCurrent = {
    createdAt: { [Sequelize.Op.between]: [startDate, endDate] },
    status: { [Sequelize.Op.notIn]: EXCLUDED_STATUSES }
  };

  const matchPrevious = {
    createdAt: { [Sequelize.Op.between]: [previousStart, previousEnd] },
    status: { [Sequelize.Op.notIn]: EXCLUDED_STATUSES }
  };

  const matchAll = rangeMatch;

  const [
    summary,
    customers,
    timeline,
    traffic,
    products,
    inventory,
    ordersInfo
  ] = await Promise.all([
    getSummaryMetrics(matchCurrent, matchPrevious, rangeMatch),
    getCustomerMetrics(rangeInfo),
    getTimeline(matchCurrent),
    getTrafficBreakdown(matchAll),
    getProductMetrics(matchCurrent),
    getInventoryMetrics(),
    getRecentOrders(rangeInfo)
  ]);

  return {
    range,
    generatedAt: new Date(),
    summary,
    customers,
    timeline,
    traffic,
    products,
    inventory,
    realTime: {
      activeOrders: ordersInfo.activeOrders,
      lastOrder: ordersInfo.recentOrders[0] || null
    },
    recentOrders: ordersInfo.recentOrders
  };
}

module.exports = {
  getAnalytics
};
