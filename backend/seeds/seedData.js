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
const sampleVouchers = [
  // Food & Dining
  {
    title: 'Pizza House - 30% Off',
    description: 'Get 30% discount on your next pizza order',
    points: 50,
    quantity_available: 100,
    categoryName: 'Food & Dining',
  },
  {
    title: 'Starbucks - Free Coffee',
    description: 'Enjoy a free medium coffee at any Starbucks location',
    points: 75,
    quantity_available: 150,
    categoryName: 'Food & Dining',
  },
  {
    title: 'Restaurant Royal - Dinner for Two',
    description: 'Complimentary dinner for 2 at our premium restaurant',
    points: 200,
    quantity_available: 50,
    categoryName: 'Food & Dining',
  },
  // Travel
  {
    title: 'Hotel Stay - 1 Night',
    description: 'One night free stay at 3-star hotels nationwide',
    points: 300,
    quantity_available: 80,
    categoryName: 'Travel',
  },
  {
    title: 'Flight Voucher - RM100',
    description: 'RM100 off on your next flight booking',
    points: 250,
    quantity_available: 60,
    categoryName: 'Travel',
  },
  {
    title: 'Car Rental - Weekend Special',
    description: '50% off on weekend car rental',
    points: 150,
    quantity_available: 90,
    categoryName: 'Travel',
  },
  // Shopping
  {
    title: 'Fashion Store - RM200 Voucher',
    description: 'RM200 shopping voucher for selected fashion stores',
    points: 180,
    quantity_available: 100,
    categoryName: 'Shopping',
  },
  {
    title: 'Electronics - RM500 Voucher',
    description: 'RM500 voucher for electronics and gadgets',
    points: 400,
    quantity_available: 40,
    categoryName: 'Shopping',
  },
  {
    title: 'Beauty Store - Free Product',
    description: 'Free beauty product up to RM100',
    points: 100,
    quantity_available: 120,
    categoryName: 'Shopping',
  },
  // Entertainment
  {
    title: 'Cinema - Movie Tickets',
    description: 'Two free movie tickets at any cinema',
    points: 120,
    quantity_available: 200,
    categoryName: 'Entertainment',
  },
  {
    title: 'Theme Park - Entrance Pass',
    description: 'Free entrance to local theme parks',
    points: 250,
    quantity_available: 50,
    categoryName: 'Entertainment',
  },
  {
    title: 'Concert Tickets - 20% Off',
    description: '20% discount on concert and live event tickets',
    points: 150,
    quantity_available: 70,
    categoryName: 'Entertainment',
  },
  // Health & Wellness
  {
    title: 'Spa - Full Body Massage',
    description: 'One complimentary full body massage at our spa',
    points: 200,
    quantity_available: 60,
    categoryName: 'Health & Wellness',
  },
  {
    title: 'Gym Membership - 1 Month',
    description: 'One month free gym membership',
    points: 250,
    quantity_available: 80,
    categoryName: 'Health & Wellness',
  },
  {
    title: 'Yoga Class - 10 Sessions',
    description: '10 free yoga sessions at our wellness center',
    points: 100,
    quantity_available: 90,
    categoryName: 'Health & Wellness',
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
        quantity_available: voucher.quantity_available,
        category_id: category._id,
        is_active: true,
      };
    });

    const createdVouchers = await Voucher.insertMany(vouchersWithCategoryIds);
    console.log(`✅ Created ${createdVouchers.length} vouchers`);

    // Seed users
    const createdUsers = await User.insertMany(users);
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