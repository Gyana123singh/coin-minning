const mongoose = require('mongoose');

mongoose.set('autoIndex', false);

let globalConnection = global.mongooseConnection;

if (!globalConnection) {
  globalConnection = {
    conn: null,
    promise: null,
  };
}

const connectDB = async () => {
  if (globalConnection.conn) {
    console.log("MongoDB: already connected");
    return globalConnection.conn;
  }

  if (!globalConnection.promise) {
    console.log("MongoDB: creating new connection...");

    globalConnection.promise = mongoose.connect(process.env.MONGODB_URI)
      .then((mongooseInstance) => {
        return mongooseInstance;
      });
  }

  globalConnection.conn = await globalConnection.promise;

  console.log("MongoDB Connected:", globalConnection.conn.connection.host);

  return globalConnection.conn;
};

global.mongooseConnection = globalConnection;

module.exports = connectDB;