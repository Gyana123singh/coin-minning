const express = require('express');
const router = express.Router();

// Import all admin routes
const authRoutes = require('./authRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const userRoutes = require('./userRoutes');
const kycRoutes = require('./kycRoutes');
const miningRoutes = require('./miningRoutes');
const transactionRoutes = require('./transactionRoutes');
const paymentRoutes = require('./paymentRoutes');
const coinRoutes = require('./coinRoutes');
const bannerRoutes = require('./bannerRoutes');
const referralRoutes = require('./referralRoutes');
const settingsRoutes = require('./settingsRoutes');
const notificationRoutes = require('./notificationRoutes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/users', userRoutes);
router.use('/kyc', kycRoutes);
router.use('/mining', miningRoutes);
router.use('/transactions', transactionRoutes);
router.use('/payments', paymentRoutes);
router.use('/coins', coinRoutes);
router.use('/banners', bannerRoutes);
router.use('/referrals', referralRoutes);
router.use('/settings', settingsRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
