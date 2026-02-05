const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Connected to MongoDB\n');
  
  // Total count
  const totalCount = await mongoose.connection.db.collection('transactions').countDocuments();
  console.log('Total Transactions:', totalCount);
  
  // Count by type
  const byType = await mongoose.connection.db.collection('transactions').aggregate([
    { $group: { _id: '$type', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
  ]).toArray();
  
  console.log('\nBy Type:');
  byType.forEach(t => {
    console.log(`  ${t._id}: ${t.count} transactions, total amount: ${t.totalAmount}`);
  });
  
  // Today's transactions
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const todayBonus = await mongoose.connection.db.collection('transactions').aggregate([
    { $match: { type: 'bonus', amount: { $gt: 0 }, createdAt: { $gte: today, $lt: tomorrow } } },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
  ]).toArray();
  
  const todayWithdrawal = await mongoose.connection.db.collection('transactions').aggregate([
    { $match: { type: 'withdrawal', amount: { $lt: 0 }, createdAt: { $gte: today, $lt: tomorrow } } },
    { $group: { _id: null, total: { $sum: { $abs: '$amount' } }, count: { $sum: 1 } } }
  ]).toArray();
  
  console.log('\nToday\'s Stats:');
  console.log('  Bonus (Added):', todayBonus[0] || { count: 0, total: 0 });
  console.log('  Withdrawal (Deducted):', todayWithdrawal[0] || { count: 0, total: 0 });
  
  // Sample recent transactions
  const recent = await mongoose.connection.db.collection('transactions')
    .find()
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();
  
  console.log('\nRecent 10 Transactions:');
  recent.forEach(t => {
    console.log(`  ${t.type}: ${t.amount} - ${t.description || 'No description'} (${t.createdAt})`);
  });
  
  mongoose.disconnect();
}).catch(err => console.error('Error:', err));
