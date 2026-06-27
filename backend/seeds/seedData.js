const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Category = require('../models/Category');
const Voucher = require('../models/Voucher');

// Sample Categories
const categories = [
  {
    name: 'Food & Dining',
    description: 'Enjoy dining experiences and food vouchers',
  },
  {
    name: 'Travel',
    description: 'Travel and accommodation vouchers',
  },
  {
    name: 'Shopping',
    description: 'Shopping and retail vouchers',
  },
  {
    name: 'Entertainment',
    description: 'Movies, events, and entertainment vouchers',
  },
  {
    name: 'Health & Wellness',
    description: 'Spa, fitness, and wellness vouchers',
  },
];

// Sample Users
const users = [
  {
    username: 'testuser',
    email: 'testuser@carter.com',
    password: 'password123',
    points: 500,
    is_active: true,
  },
  {
    username: 'john_doe',
    email: 'john@carter.com',
    password: 'password123',
    points: 1000,
    is_active: true,
  },
  {
    username: 'jane_smith',
    email: 'jane@carter.com',
    password: 'password123',
    points: 750,
    is_active: true,
  },
];

// Sample Vouchers (will be linked to categories)
// Images use stable Unsplash photo URLs sized for the card/detail views.
const sampleVouchers = [
  // Food & Dining
  {
    title: 'Pizza House - 30% Off',
    description: 'Get 30% discount on your next pizza order',
    points: 50,
    quantity_available: 100,
    categoryName: 'Food & Dining',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Starbucks - Free Coffee',
    description: 'Enjoy a free medium coffee at any Starbucks location',
    points: 75,
    quantity_available: 150,
    categoryName: 'Food & Dining',
    image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Restaurant Royal - Dinner for Two',
    description: 'Complimentary dinner for 2 at our premium restaurant',
    points: 200,
    quantity_available: 50,
    categoryName: 'Food & Dining',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80',
  },
  // Travel
  {
    title: 'Hotel Stay - 1 Night',
    description: 'One night free stay at 3-star hotels nationwide',
    points: 300,
    quantity_available: 80,
    categoryName: 'Travel',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Flight Voucher - RM100',
    description: 'RM100 off on your next flight booking',
    points: 250,
    quantity_available: 60,
    categoryName: 'Travel',
    image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Car Rental - Weekend Special',
    description: '50% off on weekend car rental',
    points: 150,
    quantity_available: 90,
    categoryName: 'Travel',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
  },
  // Shopping
  {
    title: 'Fashion Store - RM200 Voucher',
    description: 'RM200 shopping voucher for selected fashion stores',
    points: 180,
    quantity_available: 100,
    categoryName: 'Shopping',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Electronics - RM500 Voucher',
    description: 'RM500 voucher for electronics and gadgets',
    points: 400,
    quantity_available: 40,
    categoryName: 'Shopping',
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Beauty Store - Free Product',
    description: 'Free beauty product up to RM100',
    points: 100,
    quantity_available: 120,
    categoryName: 'Shopping',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80',
  },
  // Entertainment
  {
    title: 'Cinema - Movie Tickets',
    description: 'Two free movie tickets at any cinema',
    points: 120,
    quantity_available: 200,
    categoryName: 'Entertainment',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Theme Park - Entrance Pass',
    description: 'Free entrance to local theme parks',
    points: 250,
    quantity_available: 50,
    categoryName: 'Entertainment',
    image: 'https://images.unsplash.com/photo-1570829460005-c840387bb1ca?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Concert Tickets - 20% Off',
    description: '20% discount on concert and live event tickets',
    points: 150,
    quantity_available: 70,
    categoryName: 'Entertainment',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=800&q=80',
  },
  // Health & Wellness
  {
    title: 'Spa - Full Body Massage',
    description: 'One complimentary full body massage at our spa',
    points: 200,
    quantity_available: 60,
    categoryName: 'Health & Wellness',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Gym Membership - 1 Month',
    description: 'One month free gym membership',
    points: 250,
    quantity_available: 80,
    categoryName: 'Health & Wellness',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Yoga Class - 10 Sessions',
    description: '10 free yoga sessions at our wellness center',
    points: 100,
    quantity_available: 90,
    categoryName: 'Health & Wellness',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80',
  },
];

// Main seed function
const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Category.deleteMany({});
    await Voucher.deleteMany({});
    console.log('🗑️ Cleared existing data');

    // Seed categories
    const createdCategories = await Category.insertMany(categories);
    console.log(`✅ Created ${createdCategories.length} categories`);

    // Seed vouchers with category references
    const vouchersWithCategoryIds = sampleVouchers.map((voucher) => {
      const category = createdCategories.find(
        (cat) => cat.name === voucher.categoryName
      );
      return {
        title: voucher.title,
        description: voucher.description,
        points: voucher.points,
        image: voucher.image,
        quantity_available: voucher.quantity_available,
        category_id: category._id,
        is_active: true,
      };
    });

    const createdVouchers = await Voucher.insertMany(vouchersWithCategoryIds);
    console.log(`✅ Created ${createdVouchers.length} vouchers`);

    // Seed users — use create() (not insertMany) so each document runs through
    // the model's pre('save') hook and the password is hashed. insertMany skips
    // that hook, which would store plaintext passwords and break login.
    const createdUsers = await User.create(users);
    console.log(`✅ Created ${createdUsers.length} test users`);

    // Display user credentials
    console.log('\n📋 Test User Credentials:');
    createdUsers.forEach((user) => {
      console.log(`   Email: ${user.email} | Password: password123 | Points: ${user.points}`);
    });

    console.log('\n✅ Database seeding completed successfully!');

    // Close connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

// Run seed
seedDatabase();