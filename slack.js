"use strict";
const slack = require("express").Router();
const UserExpertise = require("./models/user_expertise.js");
const FIELD_GUIDELINES = require("./models/field_guidelines.js");
const COMMAND_SUMMARY = require("./models/command_summary.js");

/**
 * verifySlackToken
 * very that the token received from the response is correct for this app
 *
 * @param token {String} - token received from Slack request
 * */
function verifySlackToken(token) {
  return new Promise(function (resolve, reject) {
    if (token === process.env.SLACK_VERIFICATION_TOKEN) {
      resolve();
    } else {
      reject();
    }
  });
}

/**
 * respondWithInvalidToken
 * when an invalid token is received, we respond with this error message
 *
 * @param response {Object} - response object from request
 * */
function respondWithInvalidToken(response) {
  response.status(404).send({
    status: 404,
    message: "Invalid Slack token"
  });
}

/**
 * validFields
 * checks whether the given fields of expertise are valid
 *
 * @param fields {Array} - list of field, see field_guidelines.js for guidelines
 * */
function validFields(fields) {
  // ensure we have at least one field
  if (fields.length === 0) {
    return false;
  }

  // make sure that each field matches the result
  for (let field of fields) {
    if (field.match(/[^a-zA-Z\-\ ]/gi)) {
      return false;
    }
  }

  // return true if no error found
  return true;
}

/**
 * slackRespond
 * respond with a json object that is Slack valid
 *
 * @param response {Object} - response object from request
 * @param text {String} - Slack textual response
 * @param attachments {Array<Object>} -
 *    an array of objects Slack attachments
 *    see https://api.slack.com/docs/message-attachments
 *    > this parameter is optional
 * */
function slackRespond(response, text, attachments) {
  response.status(200).send(createSlackResponseObject(text, attachments));
}

/**
 * createSlackResponseObject
 * create a response object that is valid to Slack
 *
 * @param text {String} - Slack textual response
 * @param attachments {Array<Object>} -
 *    an array of objects Slack attachments
 *    see https://api.slack.com/docs/message-attachments
 *    > this parameter is optional
 * */
function createSlackResponseObject(text, attachments) {
  let slackObject = { text };
  if (attachments) {
    slackObject.attachments = attachments;
  }
  return slackObject;
}

/**
 * POST /set_expertise
 *
 * when a user wants to set their expertise in coma separated values
 **/
slack.post("/set_expertise", function (request, response) {
  // extract all the needed Slack information
  const { token, team_id, user_id, user_name, text } = request.body;

  verifySlackToken(token).then(function () {
    // get the new fields
    const fields = text.split(",");

    if (validFields(fields)) {
      updateUser();
    } else {
      let text = `You must have at least one valid field. Fields must match the field guidelines:`;
      text += `${FIELD_GUIDELINES}`;
      respondRequest(text);
    }

    // either set the user if found in the db or create him and
    // set the fields.
    function updateUser() {
      // fetch or create the mongo expertise for the user
      UserExpertise.findOne({ user_id, team_id }, function (err, user) {
        // create the user if we get an error or if the
        // fetched user is null (i.e. doesn't exists)
        if (err || user === null) {
          createUser();
        } else {
          user.user_name = user_name;
          user.expertise = fields;
          user.save((err) => respondRequest(err));
        }
      });
    }

    // create the user and save the user in the database
    function createUser() {
      const user = new UserExpertise({ user_id, team_id, user_name, expertise: fields });
      user.save((err) => respondRequest(err));
    }

    // respond with a valid
    function respondRequest(err) {
      let text = err ?
        `An error happened while saving your expertise. Please try again!` :
        `Your expertise(s) (*${fields}*) have been saved. Thank you!`;
      slackRespond(response, text, null);
    }

  }, () => respondWithInvalidToken(response));

});

/**
 * POST /my_expertise
 *
 * a user wants to see his own expertise
 **/
slack.post("/my_expertise", function (request, response) {
  // extract all the needed Slack information
  const { token, team_id, user_id } = request.body;

  verifySlackToken(token).then(function () {
    // fetch the user, if found, return his expertise, if not, say
    // that expertise has not been set yet
    UserExpertise.findOne({ user_id, team_id }, function (err, user) {
      // create the user if we get an error or if the
      // fetched user is null (i.e. doesn't exists)
      if (err) {
        respondRequest(err, null, "A server error occurred");
      } else if (user === null) {
        let msg = "You have not set your expertise yet. ";
        msg += "You can reset them by using `/set_expertise` in Slack.";
        respondRequest("Error", null, msg);
      } else {
        respondRequest(null, user.expertise);
      }
    });

    // respond with a valid slack response
    function respondRequest(err, fields, error_message) {
      let text = err ?
        `The following error happened while fetching your expertise: \n${error_message}\n.` :
        `_Here are your expertise(s):_\n*${fields}*\n\n You can reset them with \`/set_expertise\``;
      slackRespond(response, text, null);
    }
  }, () => respondWithInvalidToken(response));
});

/**
 * POST /team_experts
 *
 * View everyone's expertise
 * */
slack.post("/team_experts", function (request, response) {
  const { token } = request.body;

  verifySlackToken(token).then(function () {
    // find all the experts and post them as a message
    UserExpertise.find({}, function (err, expertises) {
      if (err) {
        respondRequest(err);
      } else {
        let text = "";
        expertises.forEach(function (expert) {
          text += `*${expert.user_name || expert.user_id}* - ${expert.expertise}\n`;
        });
        respondRequest(null, text);
      }
    });

    // respond with a valid slack response
    function respondRequest(err, experts) {
      let text = err ?
        `An error occurred while fetching all the experts in Team DRC` :
        `_Here is a list of experts (by username) and their fields of expertise:_\n\n${experts}`;
      slackRespond(response, text, null);
    }
  }, () => respondWithInvalidToken(response));
});

/**
 * POST /expertise_guideline
 * see the expertise guideline
 * */
slack.post("/expertise_guideline", function (request, response) {
  const { token } = request.body;

  verifySlackToken(token).then(
    () => slackRespond(response, FIELD_GUIDELINES),
    () => respondWithInvalidToken(response));
});

/**
 * POST /command_summary
 * see a list of commands that can be used on this Slack app
 * */
slack.post("/command_summary", function (request, response) {
  const { token } = request.body;
  verifySlackToken(token).then(
    () => slackRespond(response, COMMAND_SUMMARY),
    () => respondWithInvalidToken(response));
});

// export the module
module.exports = slack;