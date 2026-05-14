const { testConnection } = require('./src/config/database');
const User = require('./src/models/User');
const Product = require('./src/models/Product');
const Category = require('./src/models/Category');
const Order = require('./src/models/Order');

async function testMySQL() {
  console.log('🧪 MySQL Geçiş Testi Başlatılıyor...\n');

  // 1. Bağlantı Testi
  console.log('1️⃣  MySQL Bağlantısı Test Ediliyor...');
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ MySQL bağlantısı başarısız!');
    process.exit(1);
  }
  console.log('✅ MySQL bağlantısı başarılı\n');

  // 2. Model Testleri
  console.log('2️⃣  Modeller Test Ediliyor...');
  
  try {
    // User model test
    const userCount = await User.count();
    console.log(`✅ User modeli çalışıyor (${userCount} kullanıcı)`);

    // Category model test
    const categoryCount = await Category.count();
    console.log(`✅ Category modeli çalışıyor (${categoryCount} kategori)`);

    // Product model test
    const productCount = await Product.count();
    console.log(`✅ Product modeli çalışıyor (${productCount} ürün)`);

    // Order model test
    const orderCount = await Order.count();
    console.log(`✅ Order modeli çalışıyor (${orderCount} sipariş)`);
  } catch (error) {
    console.error('❌ Model testi başarısız:', error.message);
    process.exit(1);
  }
  console.log('');

  // 3. Query Testleri
  console.log('3️⃣  Query Testleri...');
  
  try {
    // User query
    const users = await User.findAll({ limit: 1 });
    console.log(`✅ User.findAll() çalışıyor`);

    // Category query with include
    const categories = await Category.findAll({ limit: 1 });
    console.log(`✅ Category.findAll() çalışıyor`);

    // Product query
    const products = await Product.findAll({ 
      where: { isActive: true },
      limit: 1 
    });
    console.log(`✅ Product.findAll() with where çalışıyor`);

    // Order query
    const orders = await Order.findAll({ limit: 1 });
    console.log(`✅ Order.findAll() çalışıyor`);
  } catch (error) {
    console.error('❌ Query testi başarısız:', error.message);
    process.exit(1);
  }
  console.log('');

  // 4. Aggregation Testleri
  console.log('4️⃣  Aggregation Testleri...');
  
  try {
    // Count test
    const totalUsers = await User.count();
    console.log(`✅ User.count() çalışıyor (${totalUsers} kullanıcı)`);

    // Sum test
    const totalRevenue = await Order.sum('total', {
      where: { status: { [require('sequelize').Op.ne]: 'cancelled' } }
    });
    console.log(`✅ Order.sum() çalışıyor (Toplam: ${totalRevenue || 0} TL)`);
  } catch (error) {
    console.error('❌ Aggregation testi başarısız:', error.message);
    process.exit(1);
  }
  console.log('');

  // 5. JSON Field Testleri
  console.log('5️⃣  JSON Field Testleri...');
  
  try {
    // Order items (JSON) test
    const orderWithItems = await Order.findOne({
      where: { items: { [require('sequelize').Op.ne]: null } }
    });
    if (orderWithItems) {
      console.log(`✅ Order JSON items field çalışıyor`);
    } else {
      console.log(`ℹ️  Order JSON items field test edilemedi (sipariş yok)`);
    }
  } catch (error) {
    console.error('❌ JSON field testi başarısız:', error.message);
    process.exit(1);
  }
  console.log('');

  console.log('🎉 Tüm testler başarılı! MySQL geçişi tamamlandı.');
  process.exit(0);
}

testMySQL().catch((error) => {
  console.error('❌ Test hatası:', error);
  process.exit(1);
});

