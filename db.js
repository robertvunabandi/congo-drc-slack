"use strict";
const mongoose = require("mongoose");

// connect to mongo db by using  the mongo db url and mongo client
mongoose.connect(process.env.MONGO_DB_URL, {});
mongoose.Promise = global.Promise;

// extract and export the mongo connection
const db = mongoose.connection;
db.on("error", console.error.bind(console, "Mongo DB Connection Error ::"));
module.exports = db;