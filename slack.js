"use strict";
const slack = require("express").Router();
const UserExpertise = require("./models/user_expertise.js");
const FIELD_GUIDELINES = require("./models/field_guidelines.js");

/**
 * verifySlackToken
 * very that the token received from the response is correct for this app
 *
 * @param token {String} - token received from slack request
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
    message: "Invalid slack token"
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
 * respond with a json object that is slack valid
 *
 * @param response {Object} - response object from request
 * @param text {String} - slack textual response
 * @param attachments {Array<Object>} -
 *    an array of objects slack attachments
 *    see https://api.slack.com/docs/message-attachments
 *    > this parameter is optional
 * */
function slackRespond(response, text, attachments) {
  response.status(200).send(createSlackResponseObject(text, attachments));
}

/**
 * createSlackResponseObject
 * create a response object that is valid to slack
 *
 * @param text {String} - slack textual response
 * @param attachments {Array<Object>} -
 *    an array of objects slack attachments
 *    see https://api.slack.com/docs/message-attachments
 *    > this parameter is optional
 * */
function createSlackResponseObject(text, attachments) {
  let slackObject = {text};
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
  // extract all the needed slack information
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
        `Your expertise(s) (${fields}) have been saved. Thank you!`;
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
  // extract all the needed slack information
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
        `Here are your expertise(s):\n${fields}\n\n You can reset them with \`/set_expertise\``;
      slackRespond(response, text, null);
    }
  }, () => respondWithInvalidToken(response));

  response.send("hello");
});

/**
 * POST /team_experts
 *
 * View everyone's expertise
 * */
slack.post("/team_experts", function (request, response) {
  const { token  } = request.body;

  verifySlackToken(token).then( function () {
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
        `Here is a list of experts (by username) and their fields of expertise: \n\n${experts}`;
      slackRespond(response, text, null);
    }
  }, () => respondWithInvalidToken(response));
});

module.exports = slack;

/*
ABOUT SLACK

See doc about slash commands: https://api.slack.com/slash-commands

--------------------------------------------------------------------------------
Slack request contain the following parameters:
- token:
- team_id:
- team_domain:
- channel_id:
- channel_name:
- user_id:
- user_name:
- command:
- text:
- response_url:
- trigger_id:

--------------------------------------------------------------------------------
Here's a template for extracting all of them at once:
  const var_name = {
    token,
    team_id,
    team_domain,
    channel_id,
    channel_name,
    user_id,
    user_name,
    command,
    text,
    response_url,
    trigger_id } = request.body;

--------------------------------------------------------------------------------
Slack request example:
{
  token: '<tokenidfromapp>',
  team_id: 'T9SRQJVCP',
  team_domain: 'teamdrc-hq',
  channel_id: 'DA05N3Z0E',
  channel_name: 'directmessage',
  user_id: 'U9ZAM86KC',
  user_name: 'robertv',
  command: '/expertise',
  text: 'helo',
  response_url: 'https://hooks.slack.com/commands/T9SRQJVCP/379879175223/BHfpze342MCteBKc1EaxShKO',
  trigger_id: '378606169780.332874641431.4651adc5ea359a12239f57ab3bbcce38'
}
*/