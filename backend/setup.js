const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { sequelize, testConnection, syncDatabase } = require('./src/config/database');

// Load all models FIRST to register associations before syncing
const models = require('./src/models');
const { User, Category, Product } = models;

function getSetupAdminPassword() {
  if (process.env.SETUP_ADMIN_PASSWORD) {
    return process.env.SETUP_ADMIN_PASSWORD;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Production ortaminda SETUP_ADMIN_PASSWORD tanimlanmadan setup.js calistirilamaz.');
  }

  return 'admin123';
}

function assertSetupAllowed() {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  if (process.env.ALLOW_PRODUCTION_SETUP === 'true' && process.env.ALLOW_SCHEMA_SYNC === 'true') {
    return;
  }

  throw new Error(
    'Production ortaminda setup.js varsayilan olarak engellidir. Bilerek calistirmak icin ALLOW_PRODUCTION_SETUP=true ve ALLOW_SCHEMA_SYNC=true ayarlayin.'
  );
}

async function setupDatabase() {
  try {
    assertSetupAllowed();

    // Connect to MySQL
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ MySQL bağlantısı başarısız');
      process.exit(1);
    }

    // Sync database schema (all models are already loaded with associations)
    const synced = await syncDatabase(false); // false = don't force drop tables
    if (!synced) {
      console.error('❌ Veritabanı senkronizasyonu başarısız, çıkılıyor...');
      process.exit(1);
    }
    console.log('✅ Veritabanı şeması senkronize edildi');

    const adminPassword = getSetupAdminPassword();

    // Create admin user
    const adminExists = await User.findOne({ where: { email: 'admin@anadolufenericamsanatmerkezi.com' } });
    if (!adminExists) {
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@anadolufenericamsanatmerkezi.com',
        password: adminPassword,
        role: 'admin'
      });
      console.log('✅ Admin kullanıcı oluşturuldu:', admin.email);
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔑 Varsayılan şifre: admin123');
      }
    }

    const skipDemoData =
      process.env.NODE_ENV === 'production' || process.env.SKIP_DEMO_DATA === 'true';
    if (skipDemoData) {
      console.log(
        'ℹ️  Demo kategori/ürün atlandı (production veya SKIP_DEMO_DATA=true). Sadece şema + admin.'
      );
      console.log('🎉 Veritabanı kurulumu tamamlandı (içerik ekleme: admin paneli).');
      return;
    }

    // Geliştirme / lokal demolar (canlıda çalışmaz — yukarıdaki dönüş)
    // Create sample categories
    const categories = [
      {
        name: 'Elektronik',
        description: 'Telefon, tablet, bilgisayar ve aksesuarları',
        slug: 'elektronik'
      },
      {
        name: 'Giyim',
        description: 'Erkek, kadın ve çocuk giyim ürünleri',
        slug: 'giyim'
      },
      {
        name: 'Ev & Yaşam',
        description: 'Ev dekorasyonu ve yaşam ürünleri',
        slug: 'ev-yasam'
      },
      {
        name: 'Spor',
        description: 'Spor malzemeleri ve fitness ürünleri',
        slug: 'spor'
      },
      {
        name: 'Kitap',
        description: 'Roman, ders kitabı ve dergiler',
        slug: 'kitap'
      },
      {
        name: 'Oyuncak',
        description: 'Çocuk oyuncakları ve eğitici materyaller',
        slug: 'oyuncak'
      }
    ];

    for (const catData of categories) {
      const existingCategory = await Category.findOne({ where: { slug: catData.slug } });
      if (!existingCategory) {
        const category = await Category.create(catData);
        console.log(`✅ Kategori oluşturuldu: ${catData.name}`);
      }
    }

    // Create sample products
    const electronicsCategory = await Category.findOne({ where: { slug: 'elektronik' } });
    if (electronicsCategory) {
      const products = [
        {
          name: 'iPhone 15 Pro',
          description: 'Apple iPhone 15 Pro - En yeni teknoloji ile donatılmış premium akıllı telefon',
          price: 45000,
          originalPrice: 50000,
          images: ['https://via.placeholder.com/400x400?text=iPhone+15+Pro'],
          categoryId: electronicsCategory.id,
          stock: 50,
          sku: 'IPHONE15PRO',
          tags: ['telefon', 'apple', 'premium'],
          metaTitle: 'iPhone 15 Pro - Apple Premium Akıllı Telefon',
          metaDescription: 'iPhone 15 Pro ile en yeni teknolojiyi keşfedin. Premium tasarım ve güçlü performans.',
          isFeatured: true
        },
        {
          name: 'Samsung Galaxy S24',
          description: 'Samsung Galaxy S24 - Yapay zeka destekli kamera sistemi ve güçlü performans',
          price: 35000,
          originalPrice: 40000,
          images: ['https://via.placeholder.com/400x400?text=Galaxy+S24'],
          categoryId: electronicsCategory.id,
          stock: 30,
          sku: 'GALAXYS24',
          tags: ['telefon', 'samsung', 'android'],
          metaTitle: 'Samsung Galaxy S24 - AI Destekli Akıllı Telefon',
          metaDescription: 'Galaxy S24 ile yapay zeka destekli kamera deneyimini yaşayın.',
          isFeatured: true
        },
        {
          name: 'MacBook Air M2',
          description: 'Apple MacBook Air M2 - Ultra ince tasarım ve güçlü M2 çipi',
          price: 25000,
          originalPrice: 28000,
          images: ['https://via.placeholder.com/400x400?text=MacBook+Air+M2'],
          categoryId: electronicsCategory.id,
          stock: 20,
          sku: 'MACBOOKAIRM2',
          tags: ['laptop', 'apple', 'm2'],
          metaTitle: 'MacBook Air M2 - Apple Laptop',
          metaDescription: 'MacBook Air M2 ile taşınabilir güçlü performans.',
          isFeatured: false
        }
      ];

      for (const prodData of products) {
        const existingProduct = await Product.findOne({ where: { sku: prodData.sku } });
        if (!existingProduct) {
          const product = await Product.create(prodData);
          console.log(`✅ Ürün oluşturuldu: ${prodData.name}`);
        }
      }
    }

    console.log('🎉 Veritabanı kurulumu tamamlandı!');
    console.log('📱 Frontend: http://localhost:3001');
    console.log('🔗 Backend API: http://localhost:3000');
    console.log('👤 Admin: admin@anadolufenericamsanatmerkezi.com');
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔑 Varsayılan şifre: admin123');
    }

  } catch (error) {
    console.error('❌ Veritabanı kurulum hatası:', error);
  } finally {
    await sequelize.close();
  }
}

setupDatabase();
