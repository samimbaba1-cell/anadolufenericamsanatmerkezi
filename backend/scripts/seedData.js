const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');
const User = require('../src/models/User');

dotenv.config({
  path: process.env.BACKEND_ENV_PATH || path.resolve(__dirname, '..', '.env'),
});

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
  password: 'test123456',
  phone: '5555555555',
  role: 'user'
};

async function seedData() {
  try {
    // Connect to MongoDB
    const dbUri = process.env.DATABASE_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/anadolufenericamsanatmerkezi';
    await mongoose.connect(dbUri);
    console.log('MongoDB connected');

    // Clear existing data
    await Product.deleteMany({});
    await Category.deleteMany({});
    await User.deleteMany({});
    console.log('Existing data cleared');

    // Create categories
    const categoriesWithSlugs = categories.map((category) => ({
      ...category,
      slug: slugify(category.name),
    }));
    const createdCategories = await Category.insertMany(categoriesWithSlugs);
    console.log(`${createdCategories.length} categories created`);

    // Create category map
    const categoryMap = {};
    createdCategories.forEach(cat => {
      categoryMap[cat.name] = cat._id;
    });

    // Update products with category IDs
    const productsWithCategories = products.map(product => ({
      ...product,
      category: categoryMap[product.category]
    }));

    // Create products
    const createdProducts = await Product.insertMany(productsWithCategories);
    console.log(`${createdProducts.length} products created`);

    // Create admin user - let User model's pre-save hook hash the password
    const admin = new User({
      ...adminUser,
      password: adminUser.password, // Plain password - will be hashed by pre-save hook
      status: 'active',
      isActive: true
    });
    await admin.save();
    console.log('Admin user created');

    // Create test customer user - let User model's pre-save hook hash the password
    const customer = new User({
      ...customerUser,
      password: customerUser.password, // Plain password - will be hashed by pre-save hook
      status: 'active',
      isActive: true
    });
    await customer.save();
    console.log('Test customer user created');

    console.log('Seed data created successfully!');
    console.log('Admin login: admin@anadolufenericamsanatmerkezi.com / admin123');
    console.log('Customer login: test@example.com / test123456');
    
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedData();
}

module.exports = seedData;
