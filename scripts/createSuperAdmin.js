const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('../models/Admin');

// Load env vars
dotenv.config();

const createSuperAdmin = async () => {
  try {
    // Connect to DB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if super admin exists
    const existingAdmin = await Admin.findOne({ role: 'super_admin' });
    
    if (existingAdmin) {
      console.log('Super admin already exists:', existingAdmin.email);
      process.exit(0);
    }

    // Create super admin
    const superAdmin = await Admin.create({
      name: 'Super Admin',
      email: 'admin@mining.com',
      password: 'admin123456', // Change this in production!
      role: 'super_admin',
      permissions: {
        users: true,
        kyc: true,
        mining: true,
        payments: true,
        referrals: true,
        notifications: true,
        settings: true,
        banners: true,
        coins: true,
      },
      isActive: true,
    });

    console.log('Super Admin created successfully!');
    console.log('Email:', superAdmin.email);
    console.log('Password: admin123456');
    console.log('\n⚠️  IMPORTANT: Change the password immediately after first login!\n');

    process.exit(0);
  } catch (error) {
    console.error('Error creating super admin:', error);
    process.exit(1);
  }
};

createSuperAdmin();
