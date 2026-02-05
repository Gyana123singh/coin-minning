// Script to fix existing referrals that have coinsEarned = 0
// Run with: node scripts/fixReferralCoins.js

require('dotenv').config();
const mongoose = require('mongoose');
const Referral = require('../models/Referral');

const DIRECT_BONUS = 50;
const INDIRECT_BONUS = 20;

async function fixReferralCoins() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all referrals with coinsEarned = 0
    const referralsToFix = await Referral.find({ coinsEarned: 0 });
    
    console.log(`Found ${referralsToFix.length} referrals with coinsEarned = 0`);

    for (const ref of referralsToFix) {
      const bonus = ref.type === 'direct' ? DIRECT_BONUS : INDIRECT_BONUS;
      ref.coinsEarned = bonus;
      await ref.save();
      console.log(`Fixed referral ${ref._id}: type=${ref.type}, coinsEarned=${bonus}`);
    }

    console.log('All referrals fixed!');
    
    // Show summary
    const allReferrals = await Referral.find().populate('referred', 'name');
    console.log('\n--- All Referrals ---');
    for (const ref of allReferrals) {
      console.log(`- ${ref.referred?.name || 'Unknown'}: type=${ref.type}, coins=${ref.coinsEarned}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixReferralCoins();
