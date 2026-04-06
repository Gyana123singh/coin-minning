const mongoose = require('mongoose');

// Disable automatic index creation in production by default
// Use controlled sync via Model.syncIndexes() when needed
mongoose.set('autoIndex', false);

const connectDB = async () => {
  try {
    // Prevent creating multiple connections in the same process
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      console.log('MongoDB: already connected (readyState=1) — skipping new connection');
      return mongoose.connection;
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Ensure mongoose doesn't auto-create indexes on model initialization
      autoIndex: false,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Helpful connection lifecycle logs to diagnose multiple-connection issues
    mongoose.connection.on('connected', () => console.log('Mongoose connection event: connected'));
    mongoose.connection.on('disconnected', () => console.log('Mongoose connection event: disconnected'));
    mongoose.connection.on('reconnected', () => console.log('Mongoose connection event: reconnected'));
    mongoose.connection.on('error', (err) => console.error('Mongoose connection event: error', err));

    // Optionally sync indexes across all registered models when explicitly enabled
    // Set SYNC_INDEXES=true in environment to run controlled index sync.
    if (process.env.SYNC_INDEXES === 'true') {
      console.log('SYNC_INDEXES=true — starting controlled index synchronization for all models');
      const models = Object.values(mongoose.models);
      for (const m of models) {
        try {
          const res = await m.syncIndexes();
          console.log(`Synced indexes for ${m.modelName}:`, res);
        } catch (err) {
          console.warn(`Failed to sync indexes for ${m.modelName}:`, err.message);
        }
      }
      console.log('Index synchronization complete');
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
