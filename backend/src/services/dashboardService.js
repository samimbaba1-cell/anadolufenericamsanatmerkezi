const { Op } = require('sequelize');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const reportService = require('./reportService');

function toMap(list = []) {
  return list.reduce((acc, item) => {
    const id = item?.id || item?._id;
    if (!id) {
      return acc;
    }
    acc[id] = {
      count: item.count || 0,
      amount: item.amount || 0
    };
    return acc;
  }, {});
}

function mapRecentOrders(orders = []) {
  return orders.map((order) => ({
    id: order.id || order._id,
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
  const { Op } = require('sequelize');
  const orders = await Order.findAll({
    include: [
      { model: require('../models/User'), as: 'user', attributes: ['id', 'name', 'email'], required: false }
    ],
    order: [['createdAt', 'DESC']],
    limit
  });
  return mapRecentOrders(orders.map(o => o.toJSON()));
}

async function getOrderBreakdown() {
  const { Op } = require('sequelize');
  const { fn, col } = require('sequelize');
  
  const allOrders = await Order.findAll({ attributes: ['status', 'paymentStatus', 'total', 'createdAt'] });
  
  // Group by status
  const statusMap = {};
  allOrders.forEach(o => {
    const status = o.status;
    if (!statusMap[status]) {
      statusMap[status] = { _id: status, count: 0, amount: 0 };
    }
    statusMap[status].count++;
    statusMap[status].amount += parseFloat(o.total || 0);
  });
  const status = Object.values(statusMap);

  // Group by payment status
  const paymentMap = {};
  allOrders.forEach(o => {
    const paymentStatus = o.paymentStatus;
    if (!paymentMap[paymentStatus]) {
      paymentMap[paymentStatus] = { _id: paymentStatus, count: 0, amount: 0 };
    }
    paymentMap[paymentStatus].count++;
    paymentMap[paymentStatus].amount += parseFloat(o.total || 0);
  });
  const payment = Object.values(paymentMap);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayOrders = await Order.count({ where: { createdAt: { [Op.gte]: startOfDay } } });
  const pendingFulfillment = await Order.count({ where: { status: { [Op.in]: ['pending', 'processing'] } } });
  const pendingPayments = await Order.count({ where: { paymentStatus: 'pending' } });

  return {
    status: toMap(status),
    payment: toMap(payment),
    todayOrders,
    pendingFulfillment,
    pendingPayments
  };
}

async function getInventorySnapshot() {
  const { Op } = require('sequelize');
  const { literal } = require('sequelize');
  
  const totalActive = await Product.count({ where: { isActive: true } });
  
  // Low stock: stock <= minStock where minStock > 0
  const lowStockProducts = await Product.findAll({
    where: {
      isActive: true,
      minStock: { [Op.gt]: 0 }
    },
    attributes: ['id', 'stock', 'minStock']
  });
  const lowStockCount = lowStockProducts.filter(p => p.stock <= p.minStock).length;
  
  const outOfStockCount = await Product.count({
    where: {
      isActive: true,
      stock: { [Op.lte]: 0 }
    }
  });

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
      User.count({
        where: {
          role: { [Op.ne]: 'admin' },
          createdAt: { [Op.gte]: (() => {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            return start;
          })() }
        }
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


