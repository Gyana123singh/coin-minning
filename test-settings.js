const mongoose = require('mongoose');
const Settings = require('./models/Settings');

mongoose.connect('mongodb+srv://devildecent716:UR0QPGzYtTWuz4JD@cluster0.8agmjlc.mongodb.net/minning-app')
  .then(async () => {
    console.log('Connected to Database');
    const allDocs = await Settings.find({});
    console.log('--- ALL DOCUMENTS IN SETTINGS COLLECTION ---');
    allDocs.forEach(d => {
      console.log(`Key: ${d.key} | Value: ${JSON.stringify(d.value)} | Desc: ${d.description}`);
    });
    
    const settingsObj = await Settings.getSettings();
    console.log('\n--- GET SETTINGS OBJECT ---');
    console.log('coinsPerINR:', settingsObj.coinsPerINR);
    console.log('usdToInrRate:', settingsObj.usdToInrRate);
    console.log('coinPricePerDollar:', settingsObj.coinPricePerDollar);
    
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
