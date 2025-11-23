const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');

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
    Order.aggregate([
      { $match: matchCurrent },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$total' }
        }
      }
    ]),
    Order.aggregate([
      { $match: matchPrevious },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$total' }
        }
      }
    ]),
    Order.aggregate([
      { $match: rangeMatch },
      {
        $group: {
          _id: '$status',
          total: { $sum: 1 }
        }
      }
    ])
  ]);

  const summary = currentAgg[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 };
  const prev = previousAgg[0] || { totalRevenue: 0, totalOrders: 0 };

  const revenueChange = prev.totalRevenue > 0
    ? ((summary.totalRevenue - prev.totalRevenue) / prev.totalRevenue) * 100
    : (summary.totalRevenue > 0 ? 100 : 0);

  const ordersChange = prev.totalOrders > 0
    ? ((summary.totalOrders - prev.totalOrders) / prev.totalOrders) * 100
    : (summary.totalOrders > 0 ? 100 : 0);

  const totalOrders = summary.totalOrders || 0;
  const statusTotals = statusAgg || [];
  const cancelled = statusTotals.find((item) => item._id === 'cancelled')?.total || 0;
  const refunded = statusTotals.find((item) => item._id === 'refunded')?.total || 0;
  const cancellationRate = totalOrders > 0 ? ((cancelled + refunded) / totalOrders) * 100 : 0;

  return {
    totalRevenue: summary.totalRevenue || 0,
    totalOrders,
    avgOrderValue: summary.avgOrderValue || 0,
    revenueChange: formatPercentage(revenueChange),
    ordersChange: formatPercentage(ordersChange),
    cancellationRate: formatPercentage(cancellationRate)
  };
}

async function getCustomerMetrics(rangeInfo) {
  const { startDate, endDate, previousStart, previousEnd } = rangeInfo;

  const [totalCustomers, newCustomers, previousCustomers, ordersByUser] = await Promise.all([
    User.countDocuments({ role: { $ne: 'admin' } }),
    User.countDocuments({
      role: { $ne: 'admin' },
      createdAt: { $gte: startDate, $lte: endDate }
    }),
    User.countDocuments({
      role: { $ne: 'admin' },
      createdAt: { $gte: previousStart, $lt: previousEnd }
    }),
    Order.aggregate([
      {
        $match: {
          user: { $ne: null },
          status: { $nin: EXCLUDED_STATUSES },
          createdAt: { $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$user',
          firstOrder: { $min: '$createdAt' },
          lastOrder: { $max: '$createdAt' },
          orderCount: { $sum: 1 }
        }
      }
    ])
  ]);

  const activeInRange = ordersByUser.filter(
    (item) => item.lastOrder >= startDate && item.lastOrder <= endDate
  );

  const newCustomerOrders = activeInRange.filter((item) => item.firstOrder >= startDate);
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
  const timeline = await Order.aggregate([
    { $match: matchCurrent },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        revenue: { $sum: '$total' },
        orders: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return timeline.map((item) => ({
    date: item._id,
    revenue: item.revenue,
    orders: item.orders
  }));
}

async function getTrafficBreakdown(matchAll) {
  const [sources, paymentMethods, status] = await Promise.all([
    Order.aggregate([
      { $match: matchAll },
      {
        $group: {
          _id: '$source',
          orders: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { revenue: -1 } }
    ]),
    Order.aggregate([
      { $match: matchAll },
      {
        $group: {
          _id: '$paymentMethod',
          orders: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { revenue: -1 } }
    ]),
    Order.aggregate([
      { $match: matchAll },
      {
        $group: {
          _id: '$status',
          orders: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { orders: -1 } }
    ])
  ]);

  const totalOrders = sources.reduce((sum, item) => sum + item.orders, 0);

  const mapBreakdown = (item) => ({
    name: item._id || 'Diğer',
    orders: item.orders,
    revenue: item.revenue,
    percentage: totalOrders > 0 ? formatPercentage((item.orders / totalOrders) * 100) : 0
  });

  return {
    sources: sources.map(mapBreakdown),
    paymentMethods: paymentMethods.map(mapBreakdown),
    statuses: status.map(mapBreakdown)
  };
}

async function getProductMetrics(matchCurrent) {
  const [topProducts, topCategories] = await Promise.all([
    Order.aggregate([
      { $match: matchCurrent },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          revenue: { $sum: '$items.total' },
          quantity: { $sum: '$items.quantity' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          name: { $ifNull: ['$product.name', 'Silinmiş Ürün'] },
          sku: '$product.sku',
          stock: '$product.stock',
          revenue: 1,
          quantity: 1,
          orders: 1
        }
      }
    ]),
    Order.aggregate([
      { $match: matchCurrent },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      { $lookup: {
        from: 'categories',
        localField: 'product.category',
        foreignField: '_id',
        as: 'category'
      }},
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$category.name',
          revenue: { $sum: '$items.total' },
          quantity: { $sum: '$items.quantity' }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          category: { $ifNull: ['$_id', 'Kategori yok'] },
          revenue: 1,
          quantity: 1
        }
      }
    ])
  ]);

  return {
    topProducts,
    topCategories
  };
}

async function getInventoryMetrics() {
  const lowStockQuery = {
    isActive: true,
    minStock: { $gt: 0 },
    stock: { $gt: 0 },
    $expr: { $lte: ['$stock', '$minStock'] }
  };

  const outOfStockQuery = {
    isActive: true,
    stock: { $lte: 0 }
  };

  const [
    totalProducts,
    activeProducts,
    lowStock,
    outOfStock,
    lowStockCount,
    outOfStockCount
  ] = await Promise.all([
    Product.countDocuments({}),
    Product.countDocuments({ isActive: true }),
    Product.find(lowStockQuery)
      .sort({ stock: 1 })
      .limit(10)
      .select('name sku stock minStock')
      .lean(),
    Product.find(outOfStockQuery)
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('name sku stock minStock')
      .lean(),
    Product.countDocuments(lowStockQuery),
    Product.countDocuments(outOfStockQuery)
  ]);

  return {
    overview: {
      totalProducts,
      activeProducts,
      lowStockCount,
      outOfStockCount
    },
    lowStock: lowStock.map((item) => ({
      productId: item._id,
      name: item.name,
      sku: item.sku,
      stock: item.stock,
      minStock: item.minStock
    })),
    outOfStock: outOfStock.map((item) => ({
      productId: item._id,
      name: item.name,
      sku: item.sku,
      stock: item.stock,
      minStock: item.minStock
    }))
  };
}

async function getRecentOrders(rangeInfo) {
  const recentOrders = await Order.find({})
    .sort({ createdAt: -1 })
    .limit(10)
    .select('orderNumber total status source paymentMethod createdAt');

  const activeSince = new Date(Date.now() - 15 * 60 * 1000);
  const activeOrders = await Order.countDocuments({
    createdAt: { $gte: activeSince }
  });

  return {
    activeOrders,
    recentOrders: recentOrders.map((order) => ({
      id: order._id,
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
    createdAt: { $gte: startDate, $lte: endDate },
  };

  const matchCurrent = {
    ...rangeMatch,
    status: { $nin: EXCLUDED_STATUSES }
  };

  const matchPrevious = {
    createdAt: { $gte: previousStart, $lt: previousEnd },
    status: { $nin: EXCLUDED_STATUSES }
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

