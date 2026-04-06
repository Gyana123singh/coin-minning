const mongoose = require('mongoose');

mongoose.set('autoIndex', false);

let isConnected = false;
let connectingPromise = null;

const connectDB = async () => {
  try {
    // ✅ If already connected
    if (isConnected) {
      console.log('MongoDB: already connected');
      return mongoose.connection;
    }

    // ✅ If connection is already in progress
    if (connectingPromise) {
      console.log('MongoDB: connection in progress, waiting...');
      return connectingPromise;
    }

    // ✅ Create new connection
    connectingPromise = mongoose.connect(process.env.MONGODB_URI);

    const conn = await connectingPromise;

    isConnected = true;
    connectingPromise = null;

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Lifecycle logs
    mongoose.connection.on('connected', () => console.log('Mongoose: connected'));
    mongoose.connection.on('disconnected', () => console.log('Mongoose: disconnected'));
    mongoose.connection.on('reconnected', () => console.log('Mongoose: reconnected'));
    mongoose.connection.on('error', (err) => console.error('Mongoose error:', err));

    return conn;

  } catch (error) {
    connectingPromise = null;
    console.error(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;