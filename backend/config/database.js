const mongoose = require('mongoose');

// Cache the connection on the global object so warm serverless invocations
// reuse a single pool instead of opening a new connection on every request
// (which quickly exhausts MongoDB Atlas's connection limit). On a normal
// long-running server this simply connects once and returns the cached value.
let cached = global._mongooseConn;
if (!cached) cached = global._mongooseConn = { conn: null, promise: null };

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGO_URI)
      .then((mongooseInstance) => {
        console.log(`✅ MongoDB Connected: ${mongooseInstance.connection.host}`);
        return mongooseInstance;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

module.exports = connectDB;
