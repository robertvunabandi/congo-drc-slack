const mongoose = require("mongoose");

// user_expertise
const UserExpertiseSchema = new mongoose.Schema({
  team_id: {type: String, required: true},
  user_id: {type: String, required: true},
  expertise: {type: Array, required: true}
});

module.exports = mongoose.model("UserExpertiseModel", UserExpertiseSchema);