const mongoose = require('mongoose');

var venueSchema = new mongoose.Schema({
  name: String,
  going: [{
    id:String,
    username: String
  }]
});

module.exports = mongoose.model("Venues", venueSchema);
