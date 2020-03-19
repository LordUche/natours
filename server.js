require('dotenv/config');
const mongoose = require('mongoose');

process.on('uncaughtException', err => {
  console.error('UNCAUGHT EXCEPTION 💥 Shutting down server...');
  console.error(`${err.name}:`, err.message);
  process.exit(1);
});

const app = require('./app');

mongoose.connect(
  process.env.MONGODB_URI,
  {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  },
  err => {
    if (err) console.log('Database connection error 💥:', err.message);
    else console.log('Database connection successful!');
  }
);

const port = process.env.PORT || 3000;
const server = app.listen(port, () => console.log('Server is running 🚀'));

process.on('unhandledRejection', err => {
  console.error('UNHANDLED REJECTION 💥 Shutting down server...');
  console.error(`${err.name}:`, err.message);
  server.close(() => process.exit(1));
});
