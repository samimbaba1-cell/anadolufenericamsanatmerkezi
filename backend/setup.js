const mongoose = require('mongoose');
const User = require('./src/models/User');
const Category = require('./src/models/Category');
const Product = require('./src/models/Product');
require('dotenv').config();

async function setupDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/anadolufenericamsanatmerkezi');
    console.log('✅ MongoDB bağlantısı başarılı');

    // Create admin user
    const adminExists = await User.findOne({ email: 'admin@anadolufenericamsanatmerkezi.com' });
    if (!adminExists) {
      const admin = new User({
        name: 'Admin',
        email: 'admin@anadolufenericamsanatmerkezi.com',
        password: 'admin123',
        role: 'admin'
      });
      await admin.save();
      console.log('✅ Admin kullanıcı oluşturuldu (admin@anadolufenericamsanatmerkezi.com / admin123)');
    }

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
      const existingCategory = await Category.findOne({ slug: catData.slug });
      if (!existingCategory) {
        const category = new Category(catData);
        await category.save();
        console.log(`✅ Kategori oluşturuldu: ${catData.name}`);
      }
    }

    // Create sample products
    const electronicsCategory = await Category.findOne({ slug: 'elektronik' });
    if (electronicsCategory) {
      const products = [
        {
          name: 'iPhone 15 Pro',
          description: 'Apple iPhone 15 Pro - En yeni teknoloji ile donatılmış premium akıllı telefon',
          price: 45000,
          originalPrice: 50000,
          images: ['https://via.placeholder.com/400x400?text=iPhone+15+Pro'],
          category: electronicsCategory._id,
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
          category: electronicsCategory._id,
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
          category: electronicsCategory._id,
          stock: 20,
          sku: 'MACBOOKAIRM2',
          tags: ['laptop', 'apple', 'm2'],
          metaTitle: 'MacBook Air M2 - Apple Laptop',
          metaDescription: 'MacBook Air M2 ile taşınabilir güçlü performans.',
          isFeatured: false
        }
      ];

      for (const prodData of products) {
        const existingProduct = await Product.findOne({ sku: prodData.sku });
        if (!existingProduct) {
          const product = new Product(prodData);
          await product.save();
          console.log(`✅ Ürün oluşturuldu: ${prodData.name}`);
        }
      }
    }

    console.log('🎉 Veritabanı kurulumu tamamlandı!');
    console.log('📱 Frontend: http://localhost:3001');
    console.log('🔗 Backend API: http://localhost:3000');
    console.log('👤 Admin: admin@anadolufenericamsanatmerkezi.com / admin123');

  } catch (error) {
    console.error('❌ Veritabanı kurulum hatası:', error);
  } finally {
    await mongoose.disconnect();
  }
}

setupDatabase();
