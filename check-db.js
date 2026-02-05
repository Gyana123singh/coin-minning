const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://devildecent716:UR0QPGzYtTWuz4JD@cluster0.8agmjlc.mongodb.net/minning-app')
  .then(async () => {
    console.log('Connected to MongoDB Atlas');
    
    const db = mongoose.connection.db;
    
    // Count documents
    const users = await db.collection('users').countDocuments();
    const sessions = await db.collection('miningsessions').countDocuments();
    const completed = await db.collection('miningsessions').countDocuments({ status: 'completed' });
    const active = await db.collection('miningsessions').countDocuments({ status: 'active' });
    
    // Get total mined coins
    const totalMined = await db.collection('miningsessions').aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$earnedCoins' } } }
    ]).toArray();
    
    // Get sample user with miningStats
    const sampleUser = await db.collection('users').findOne({}, { projection: { name: 1, email: 1, miningStats: 1, coinBalance: 1 } });
    
    console.log('\n=== DATABASE STATS ===');
    console.log('Total Users:', users);
    console.log('Total Mining Sessions:', sessions);
    console.log('Completed Sessions:', completed);
    console.log('Active Sessions:', active);
    console.log('Total Mined Coins (from sessions):', totalMined[0]?.total || 0);
    
    if (sampleUser) {
      console.log('\n=== SAMPLE USER ===');
      console.log('Name:', sampleUser.name);
      console.log('Email:', sampleUser.email);
      console.log('Mining Stats:', JSON.stringify(sampleUser.miningStats, null, 2));
      console.log('Coin Balance:', sampleUser.coinBalance);
    } else {
      console.log('\nNo users found in database');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection Error:', err.message);
    process.exit(1);
  });
