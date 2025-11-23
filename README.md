# Anadolu Feneri Cam Sanat Merkezi - E-commerce Platform

Modern, responsive e-commerce platform with comprehensive admin panel.

## 🚀 Features

### Frontend
- **Next.js 15** with App Router
- **React 18** with modern hooks
- **Tailwind CSS** for styling
- **Responsive design** for all devices
- **SEO optimized** with meta tags
- **Image optimization** with Next.js Image
- **Lazy loading** for better performance

### Backend
- **Node.js** with Express
- **MongoDB** with Mongoose
- **JWT authentication**
- **RESTful API** design
- **File upload** with Multer
- **Rate limiting** and security

### Admin Panel
- **Dashboard** with analytics
- **Product management** (CRUD)
- **Category management**
- **Order management**
- **User management**
- **Banner management**
- **Content management** (Blog, News)
- **SEO management**
- **Theme customization**
- **Settings management**
- **Coupon/Discount system**

### E-commerce Features
- **Shopping cart** with persistent storage
- **User authentication** (Register/Login)
- **Product search** and filtering
- **Category browsing**
- **Order processing**
- **Payment integration** (Iyzico)
- **Responsive design**

## 🛠️ Installation

### Prerequisites
- Node.js (v18 or higher)
- MongoDB
- npm or yarn

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/AnadoluFeneriCamSanatMerkezi.git
cd AnadoluFeneriCamSanatMerkezi
```

2. **Install dependencies**
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

3. **Environment Setup (CRITICAL!)**
```bash
# Create backend .env file
cd backend
cp env.example .env

# Generate a strong JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy the output and paste it into JWT_SECRET in backend/.env
```

4. **Configure environment variables**
Edit `backend/.env` file with your configuration:
- **JWT_SECRET** (REQUIRED): Use the generated secret from step 3
- **DATABASE_URL**: MongoDB connection string
  - Local: `mongodb://localhost:27017/anadolufenericamsanatmerkezi`
  - Atlas: `mongodb+srv://user:pass@cluster.mongodb.net/anadolufenericamsanatmerkezi`
- **IYZICO_API_KEY** & **IYZICO_SECRET_KEY**: Payment integration (optional)
- **SMTP settings**: Email notifications (optional)

⚠️ **SECURITY WARNING:** Never commit real credentials to Git! Always use `.env` files.

5. **Start the application**
```bash
# Start backend (from root directory)
cd backend
npm run dev

# Start frontend (from root directory)
cd frontend
npm run dev
```

## 🌐 Access

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Admin Panel**: http://localhost:3000/admin

## 👤 Admin Access

Default admin credentials:
- **Email**: admin@example.com
- **Password**: admin123

> **Note**: Change these credentials in production!

## 📁 Project Structure

```
AnadoluFeneriCamSanatMerkezi/
├── frontend/                 # Next.js frontend
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # Reusable components
│   │   ├── context/         # React contexts
│   │   └── utils/           # Utility functions
│   └── public/              # Static assets
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── models/          # MongoDB models
│   │   ├── routes/          # API routes
│   │   └── middleware/      # Custom middleware
│   └── uploads/             # File uploads
├── docker-compose.yml       # Docker configuration
└── README.md
```

## 🚀 Deployment

### Docker (Recommended)
```bash
docker-compose up -d
```

### Manual Deployment
1. Build frontend: `cd frontend && npm run build`
2. Start backend: `cd backend && npm start`
3. Start frontend: `cd frontend && npm start`

## 🔧 Available Scripts

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Backend
- `npm run dev` - Start development server
- `npm start` - Start production server
- `npm run test` - Run tests

## 📝 API Documentation

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (Admin)
- `PUT /api/products/:id` - Update product (Admin)
- `DELETE /api/products/:id` - Delete product (Admin)

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category (Admin)
- `PUT /api/categories/:id` - Update category (Admin)
- `DELETE /api/categories/:id` - Delete category (Admin)

### Orders
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create order
- `PUT /api/orders/:id` - Update order (Admin)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Tailwind CSS for the utility-first CSS
- MongoDB for the database
- All contributors and users

## 📞 Support

If you have any questions or need help, please open an issue or contact us.

---

**Made with ❤️ by Anadolu Feneri Cam Sanat Merkezi Ekibi**