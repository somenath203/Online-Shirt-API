const mongoose = require('mongoose');

const connectWithDb = () => {
  mongoose
    .connect(process.env.DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(console.log('Conenction to MongoDB is successful'))
    .catch((error) => {
      console.log('Connection to MongoDB failed');
      console.log(error);
      process.exit(1);
    });
};

module.exports = connectWithDb;
