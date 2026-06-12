// Shared MongoDB client — connection is cached across serverless invocations
// to avoid opening a new connection on every request.
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const DB_NAME = 'dayknot';

let cachedClient = null;

async function connectDB() {
  if (cachedClient) return cachedClient.db(DB_NAME);
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
  });
  await client.connect();
  cachedClient = client;
  return client.db(DB_NAME);
}

module.exports = { connectDB };
