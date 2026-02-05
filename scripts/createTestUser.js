const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Settings = require('../models/Settings');

const createTestUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if test user exists
    const existingUser = await User.findOne({ email: 'testuser@test.com' });
    if (existingUser) {
      console.log('Test user already exists!');
      console.log('Email: testuser@test.com');
      console.log('Password: test123456');
      console.log('User ID:', existingUser._id);
      process.exit(0);
    }

    // Get settings for signup bonus
    const settings = await Settings.getSettings();

    // Create test user
    const user = await User.create({
      email: 'testuser@test.com',
      name: 'Test User',
      password: 'test123456',
      referralCode: 'TESTUSER',
      isEmailVerified: true,
      status: 'active',
      'miningStats.totalCoins': settings.signupBonus || 100,
    });

    console.log('✅ Test user created successfully!');
    console.log('Email: testuser@test.com');
    console.log('Password: test123456');
    console.log('Referral Code: TESTUSER');
    console.log('User ID:', user._id);
    console.log('Initial Coins:', user.miningStats.totalCoins);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

createTestUser();
