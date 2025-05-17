// mongodb.js

const mongodb = require("mongodb");
const { MongoClient } = mongodb;
const url =process.env.MONGODB_URl
const dbName = "qr-app";

let client;

async function getDatabase() {
  if (!client) {
    client = new MongoClient(url);

    try {
      await client.connect();
      console.log("Connected to MongoDB");
    } catch (err) {
      console.error("Failed to connect to MongoDB", err);
      throw err;
    }
  }

  return client.db(dbName);
}

module.exports = { getDatabase };
