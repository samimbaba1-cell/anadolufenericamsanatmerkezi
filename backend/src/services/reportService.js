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
    createdAt: { $gte: startDate, $lte: endDate },
    status: { $nin: EXCLUDED_STATUSES }
  };

  const matchPrevious = {
    createdAt: { $gte: previousStartDate, $lt: previousEndDate },
    status: { $nin: EXCLUDED_STATUSES }
  };

  const [currentSummary] = await Order.aggregate([
    { $match: matchCurrent },
    {
      $group: {
        _id: null,
        revenue: { $sum: '$total' },
        orders: { $sum: 1 }
      }
    }
  ]);

  const [previousSummary] = await Order.aggregate([
    { $match: matchPrevious },
    {
      $group: {
        _id: null,
        revenue: { $sum: '$total' },
        orders: { $sum: 1 }
      }
    }
  ]);

  const totalRevenue = currentSummary?.revenue || 0;
  const totalOrders = currentSummary?.orders || 0;
  const previousRevenue = previousSummary?.revenue || 0;

  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const growth = previousRevenue > 0
    ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
    : (totalRevenue > 0 ? 100 : 0);

  const timeline = await Order.aggregate([
    { $match: matchCurrent },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$createdAt'
          }
        },
        revenue: { $sum: '$total' },
        orders: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const marketplaces = await Order.aggregate([
    { $match: matchCurrent },
    {
      $group: {
        _id: '$source',
        revenue: { $sum: '$total' },
        orders: { $sum: 1 }
      }
    },
    { $sort: { revenue: -1 } }
  ]);

  return {
    sales: {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      growth,
      previousRevenue,
      timeline: timeline.map((item) => ({
        date: item._id,
        revenue: item.revenue,
        orders: item.orders
      })),
      marketplaces: marketplaces.map((item) => ({
        source: item._id || 'website',
        revenue: item.revenue,
        orders: item.orders
      }))
    }
  };
}

async function getProductInsights(range = '30d') {
  const { startDate, endDate } = resolveRange(range);
  const match = {
    createdAt: { $gte: startDate, $lte: endDate },
    status: { $nin: EXCLUDED_STATUSES }
  };

  const topSelling = await Order.aggregate([
    { $match: match },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.total' }
      }
    },
    { $sort: { totalRevenue: -1 } },
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
        sales: '$totalQuantity',
        revenue: '$totalRevenue'
      }
    }
  ]);

  const lowStock = await Product.aggregate([
    {
      $match: {
        isActive: true,
        minStock: { $gt: 0 }
      }
    },
    {
      $addFields: {
        needsAttention: {
          $and: [
            { $lte: ['$stock', '$minStock'] },
            { $gt: ['$stock', 0] }
          ]
        }
      }
    },
    { $match: { needsAttention: true } },
    {
      $project: {
        _id: 0,
        productId: '$_id',
        name: '$name',
        stock: '$stock',
        minStock: '$minStock'
      }
    },
    { $sort: { stock: 1 } },
    { $limit: 10 }
  ]);

  const outOfStock = await Product.find({
    isActive: true,
    stock: { $lte: 0 }
  })
    .sort({ updatedAt: 1 })
    .limit(10)
    .select({ _id: 0, productId: '$_id', name: 1, stock: 1, minStock: 1 })
    .lean();

  return {
    products: {
      topSelling,
      lowStock,
      outOfStock
    }
  };
}

async function getCustomerInsights(range = '30d') {
  const { startDate, endDate } = resolveRange(range);

  const customerOrders = await Order.aggregate([
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
        totalOrders: { $sum: 1 }
      }
    }
  ]);

  const activeCustomers = customerOrders.filter(
    (customer) => customer.lastOrder >= startDate && customer.lastOrder <= endDate
  );
  const newCustomers = activeCustomers.filter(
    (customer) => customer.firstOrder >= startDate
  );
  const returningCustomers = activeCustomers.length - newCustomers.length;

  const totalCustomers = await User.countDocuments({ role: { $ne: 'admin' } });

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

