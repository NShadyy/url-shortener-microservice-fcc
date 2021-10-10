const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const ShortUrlSchema = mongoose.Schema(
  {
    _id: Number,
    originalUrl: String,
  },
  { _id: false },
);
ShortUrlSchema.plugin(AutoIncrement);

const ShortUrl = mongoose.model('ShortUrl', ShortUrlSchema);

module.exports = { ShortUrl };
