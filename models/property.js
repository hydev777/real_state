const mongoose = require("mongoose");
const { Schema } = mongoose;

const PropertiesSchema = new Schema({
  title: String,
  images: [{ id: String, name: String }],
  description: String,
  bedrooms: String,
  reservations: [
    {
      date_range: [Date, Date],
      name: String,
      phone: String,
      email: String,
      reservation_type: String,
      active: Boolean,
      date_made: Date,
    },
  ],
  bathrooms: String,
  availability: String,
  created_at: Date,
  rate_day: String,
  rate_week: String,
  rate_month: String,
});

PropertiesSchema.index({ title: "text" });

// const RentSchema = new Schema({
//     property_id: String,
//     property_type_id: String,
//     price: Number,
//     rate: String
// });

// const UserSchema = new Schema({
//     user: String,
//     password: String,
//     privilige: String,
//     token: String
// });

const Property = mongoose.model("properties", PropertiesSchema);
// exports.rent = mongoose.model("rent", RentSchema);
// exports.user = mongoose.model("user", UserSchema);

module.exports = Property;
