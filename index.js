"use strict";
// load env variables
require("dotenv").config();

// start the app using express
const app = require("express")();

// log the requests onto the console using morgan
// see: https://github.com/expressjs/morgan
app.use(require("morgan")(":method :url :status :res[content-length] - :response-time ms"));

// parse POST requests with body-parser
const body_parser = require("body-parser");
app.use(body_parser.urlencoded({ extended: false }));
app.use(body_parser.json());

// import the db so that we actually connect to it
const db = require("./db.js");

// bind the /slack endpoint to the slack router
app.use("/slack", require("./slack.js"));

// handle user errors: 4xx
app.use(function(request, response) {
  response.status(404).send({
    status: 404,
    message: "The requested resource was not found",
  });
});

// handle server errors: 5xx
app.use(function (error, request, response) {
  console.error(error.stack);

  const message = process.env.NODE_ENV === "production" ?
    "Something went wrong, we\'re looking into it..." : error.stack;

  response.status(500).send({
    status: 500,
    message,
  });
});

// get the port and use it to listen to the requests
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`app listening on port ${PORT}`));