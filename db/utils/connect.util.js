const mongoose = require('mongoose');
const { Logger } = require('../../logger');

module.exports = {
  connectToDb: () => {
    mongoose
      .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
      .then(() => {
        Logger.info('Mongoose.connect.success', 'Connected to DB!');
      })
      .catch((error) => {
        Logger.error('Mongoose.connect.failed', error, 'Connection to DB failed!');
        process.exit(1);
      });
  },
};
