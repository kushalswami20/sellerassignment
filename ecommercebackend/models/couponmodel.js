const mongoose = require('mongoose');


const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  discountPercentage: {
    type: Number,
    required: true
  }
});

module.exports = mongoose.model('Coupon', couponSchema);


