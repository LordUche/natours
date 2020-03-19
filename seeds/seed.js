require('dotenv/config');
const fs = require('fs');
const mongoose = require('mongoose');
const User = require('../models/userModel');
const Tour = require('../models/tourModel');
const Review = require('../models/reviewModel');

mongoose.connect(
  process.env.MONGODB_URI,
  {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  },
  err => {
    if (err) console.log('Database connection error:', err.message);
    else console.log('Database connection successful!');
  }
);

const users = JSON.parse(
  fs.readFileSync(`${__dirname}/../dev-data/data/users.json`, 'utf-8')
);
const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/../dev-data/data/tours.json`, 'utf-8')
);
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/../dev-data/data/reviews.json`, 'utf-8')
);

Review.deleteMany({})
  .then(() => Tour.deleteMany({}))
  .then(() => User.deleteMany({}))
  .then(() => User.create(users, { validateBeforeSave: false }))
  .then(() => Tour.create(tours))
  .then(() => Review.create(reviews))
  .then(() => {
    console.log('Seeding successful!');
    process.exit(0);
  })
  .catch(err => {
    console.log('ERROR 💥:', err.message);
    process.exit(1);
  });
