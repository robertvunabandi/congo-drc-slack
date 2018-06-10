"use strict";
const slack = require("express").Router();

slack.use("/", function (request, response, next) {
  console.log("logging request");
  console.log(request.body);
  next();
});

/**
 * POST /set_expertise
 *
 * when a user wants to set their expertise in coma separated values
 **/
slack.post("/set_expertise", function (request, response) {
  response.send("hello");
});

/**
 * POST /my_expertise
 *
 * a user wants to see his own expertise
 **/
slack.post("/my_expertise", function (request, response) {
  response.send("hello");
});

module.exports = slack;