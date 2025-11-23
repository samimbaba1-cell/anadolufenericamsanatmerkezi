const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const reportService = require('./reportService');

function toMap(list = []) {
  return list.reduce((acc, item) => {
    if (!item?._id) {
      return acc;
    }
    acc[item._id] = {
      count: item.count || 0,
      amount: item.amount || 0
    };
    return acc;
  }, {});
}

function mapRecentOrders(orders = []) {
  return orders.map((order) => ({
    id: order._id,
    orderNumber: order.orderNumber,
    total: order.total || 0,
    status: order.status,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
    source: order.source || 'website',
    customer: {
      name: order.user?.name || `${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}`.trim(),
      email: order.user?.email || null
    }
  }));
}

async function getRecentOrders(limit = 6) {
  const orders = await Order.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('orderNumber total status paymentStatus source createdAt shippingAddress.firstName shippingAddress.lastName user')
    .populate('user', 'name email')
    .lean();
  return mapRecentOrders(orders);
}

async function getOrderBreakdown() {
  const [status, payment] = await Promise.all([
    Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$total' }
        }
      }
    ]),
    Order.aggregate([
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          amount: { $sum: '$total' }
        }
      }
    ])
  ]);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [todayOrders, pendingFulfillment, pendingPayments] = await Promise.all([
    Order.countDocuments({ createdAt: { $gte: startOfDay } }),
    Order.countDocuments({ status: { $in: ['pending', 'processing'] } }),
    Order.countDocuments({ paymentStatus: 'pending' })
  ]);

  return {
    status: toMap(status),
    payment: toMap(payment),
    todayOrders,
    pendingFulfillment,
    pendingPayments
  };
}

async function getInventorySnapshot() {
  const [totalActive, lowStockCount, outOfStockCount] = await Promise.all([
    Product.countDocuments({ isActive: true }),
    Product.countDocuments({
      isActive: true,
      minStock: { $gt: 0 },
      $expr: { $lte: ['$stock', '$minStock'] }
    }),
    Product.countDocuments({ isActive: true, stock: { $lte: 0 } })
  ]);

  return {
    totalActive,
    lowStockCount,
    outOfStockCount
  };
}

async function getDashboardOverview({ range = '30d' } = {}) {
  const [salesResult, productResult, customerResult, ordersSummary, recentOrders, inventorySnapshot, activeCustomersToday] =
    await Promise.all([
      reportService.getSalesSummary(range),
      reportService.getProductInsights(range),
      reportService.getCustomerInsights(range),
      getOrderBreakdown(),
      getRecentOrders(6),
      getInventorySnapshot(),
      User.countDocuments({
        role: { $ne: 'admin' },
        createdAt: { $gte: (() => {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          return start;
        })() }
      })
    ]);

  const sales = salesResult.sales || {};
  const products = productResult.products || {};
  const customers = customerResult.customers || {};

  const inventory = {
    ...inventorySnapshot,
    lowStock: products.lowStock?.slice(0, 6) || [],
    outOfStock: products.outOfStock?.slice(0, 6) || []
  };

  return {
    range,
    generatedAt: new Date(),
    sales,
    customers: {
      ...customers,
      newCustomersToday: activeCustomersToday
    },
    orders: ordersSummary,
    inventory,
    topProducts: products.topSelling?.slice(0, 6) || [],
    recentOrders,
    marketplaces: sales.marketplaces || [],
    timeline: sales.timeline || []
  };
}

module.exports = {
  getDashboardOverview
};


