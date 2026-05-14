/**
 * Sadece geliştirme + Playwright global-setup. NODE_ENV=production iken cagrildiginda
 * hata verir; canlida asla calistirilmamali.
 */
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: process.env.BACKEND_ENV_PATH || path.resolve(__dirname, '..', '.env'),
});

const { sequelize, testConnection } = require('../src/config/database');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');
const User = require('../src/models/User');

// Sample categories
const slugify = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9çğıöşü\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const categories = [
  { name: 'Elektronik', description: 'Telefon, laptop, tablet ve diğer elektronik ürünler' },
  { name: 'Giyim', description: 'Erkek, kadın ve çocuk giyim ürünleri' },
  { name: 'Ev & Yaşam', description: 'Ev dekorasyonu ve yaşam ürünleri' },
  { name: 'Spor', description: 'Spor malzemeleri ve fitness ürünleri' },
  { name: 'Kitap', description: 'Kitaplar ve dergiler' },
  { name: 'Kozmetik', description: 'Güzellik ve bakım ürünleri' },
  { name: 'Oyuncak', description: 'Çocuk oyuncakları ve oyunlar' },
  { name: 'Otomotiv', description: 'Araç aksesuarları ve yedek parçalar' }
];

// Sample products
const products = [
  {
    name: 'iPhone 15 Pro Max',
    description: 'En yeni iPhone modeli. A17 Pro çip, 48MP kamera ve Titanium tasarım.',
    price: 89999,
    stock: 25,
    minStock: 5,
    category: 'Elektronik',
    images: [
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&h=500&fit=crop'
    ]
  },
  {
    name: 'Samsung Galaxy S24 Ultra',
    description: 'S Pen ile gelen yaratıcılık. 200MP kamera ve AI özellikleri.',
    price: 79999,
    stock: 30,
    minStock: 5,
    category: 'Elektronik',
    images: [
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500&h=500&fit=crop'
    ]
  },
  {
    name: 'MacBook Pro 16"',
    description: 'M3 Pro çip ile güçlü performans. 16GB RAM ve 512GB SSD.',
    price: 129999,
    stock: 15,
    minStock: 3,
    category: 'Elektronik',
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500&h=500&fit=crop'
    ]
  },
  {
    name: 'Nike Air Max 270',
    description: 'Rahat ve şık spor ayakkabı. Günlük kullanım için ideal.',
    price: 2499,
    stock: 50,
    minStock: 10,
    category: 'Spor',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500&h=500&fit=crop'
    ]
  },
  {
    name: 'Adidas Ultraboost 22',
    description: 'Koşu için tasarlanmış premium spor ayakkabı.',
    price: 2999,
    stock: 40,
    minStock: 8,
    category: 'Spor',
    images: [
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop'
    ]
  },
  {
    name: 'Levi\'s 501 Jean',
    description: 'Klasik straight fit jean. %100 pamuk, yıkanmış görünüm.',
    price: 899,
    stock: 60,
    minStock: 15,
    category: 'Giyim',
    images: [
      'https://images.unsplash.com/photo-1541099649105-fbedadc6e6e0?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=500&h=500&fit=crop'
    ]
  },
  {
    name: 'Zara Oversized T-Shirt',
    description: 'Rahat kesim pamuklu t-shirt. Çok renk seçeneği.',
    price: 299,
    stock: 100,
    minStock: 20,
    category: 'Giyim',
    images: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1503341504253-dff443548d0e?w=500&h=500&fit=crop'
    ]
  },
  {
    name: 'IKEA Kallax Raf',
    description: '4x4 modüler raf sistemi. Beyaz renk, kolay montaj.',
    price: 1299,
    stock: 20,
    minStock: 5,
    category: 'Ev & Yaşam',
    images: [
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500&h=500&fit=crop'
    ]
  },
  {
    name: 'Philips Hue Starter Kit',
    description: 'Akıllı LED ampul seti. Uygulama ile kontrol edilebilir.',
    price: 1999,
    stock: 35,
    minStock: 8,
    category: 'Ev & Yaşam',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=500&fit=crop'
    ]
  },
  {
    name: 'Harry Potter Serisi',
    description: '7 kitaptan oluşan tam set. Ciltli özel baskı.',
    price: 599,
    stock: 45,
    minStock: 10,
    category: 'Kitap',
    images: [
      'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500&h=500&fit=crop'
    ]
  },
  {
    name: 'Lego Creator Set',
    description: '3-in-1 yaratıcılık seti. 3 farklı model yapılabilir.',
    price: 899,
    stock: 30,
    minStock: 8,
    category: 'Oyuncak',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=500&fit=crop'
    ]
  },
  {
    name: 'L\'Oreal Revitalift Krem',
    description: 'Anti-aging yüz kremi. 50ml, hassas ciltler için uygun.',
    price: 199,
    stock: 80,
    minStock: 20,
    category: 'Kozmetik',
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=500&h=500&fit=crop'
    ]
  }
];

// Sample admin user
const adminUser = {
  name: 'Admin User',
  email: 'admin@anadolufenericamsanatmerkezi.com',
  password: 'admin123',
  phone: '5551234567',
  role: 'admin'
};

const customerUser = {
  name: 'Test Kullanıcı',
  email: 'test@example.com',
  password: 'Test123456',
  phone: '5555555555',
  role: 'user'
};

function assertSeedingAllowed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'seedData yalnizca gelistirme ve Playwright E2E icindir. Canli veritabaninda asla calistirilmaz. Canli icerik icin admin paneli kullanin.'
    );
  }
}

async function seedData() {
  try {
    assertSeedingAllowed();

    // Connect to MySQL (testConnection already logs success message)
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ MySQL bağlantısı başarısız');
      process.exit(1);
    }

    // Clear existing data - MySQL'de foreign key constraint nedeniyle TRUNCATE kullanamıyoruz
    // Önce foreign key'leri devre dışı bırak, sonra DELETE yap, sonra tekrar aktif et
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Delete in correct order (child tables first)
    await sequelize.query('DELETE FROM reviews');
    await sequelize.query('DELETE FROM orders');
    await sequelize.query('DELETE FROM products');
    await sequelize.query('DELETE FROM categories');
    await sequelize.query('DELETE FROM users'); // Delete all users, we'll recreate them
    
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Mevcut veriler temizlendi');

    // Create categories
    const categoriesWithSlugs = categories.map((category) => ({
      ...category,
      slug: slugify(category.name),
    }));
    
    const createdCategories = [];
    for (const catData of categoriesWithSlugs) {
      const category = await Category.create(catData);
      createdCategories.push(category);
    }
    console.log(`✅ ${createdCategories.length} kategori oluşturuldu`);

    // Create category map
    const categoryMap = {};
    createdCategories.forEach(cat => {
      categoryMap[cat.name] = cat.id;
    });

    // Update products with category IDs
    const productsWithCategories = products.map(product => ({
      ...product,
      categoryId: categoryMap[product.category]
    }));

    // Create products
    const createdProducts = [];
    for (const prodData of productsWithCategories) {
      const product = await Product.create(prodData);
      createdProducts.push(product);
    }
    console.log(`✅ ${createdProducts.length} ürün oluşturuldu`);

    // Create admin user - check if exists first
    let admin = await User.findOne({ where: { email: adminUser.email } });
    if (!admin) {
      admin = await User.create({
        ...adminUser,
        password: adminUser.password, // Plain password - will be hashed by pre-save hook
        status: 'active',
        isActive: true
      });
      console.log('✅ Admin kullanıcı oluşturuldu');
    } else {
      console.log('ℹ️  Admin kullanıcı zaten mevcut');
    }

    // Create test customer user - check if exists first
    let customer = await User.findOne({ where: { email: customerUser.email } });
    if (!customer) {
      customer = await User.create({
        ...customerUser,
        password: customerUser.password, // Plain password - will be hashed by pre-save hook
        status: 'active',
        isActive: true
      });
      console.log('✅ Test müşteri kullanıcı oluşturuldu');
    } else {
      console.log('ℹ️  Test müşteri kullanıcı zaten mevcut');
    }

    console.log('🎉 Seed verileri başarıyla oluşturuldu!');
    if (process.env.NODE_ENV !== 'production') {
      console.log('👤 Admin giriş: admin@anadolufenericamsanatmerkezi.com / admin123');
      console.log('👤 Müşteri giriş: test@example.com / Test123456');
    }
    
  } catch (error) {
    console.error('❌ Seed verisi oluşturma hatası:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  seedData();
}

module.exports = seedData;
