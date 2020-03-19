const { promisify } = require('util');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const mailer = require('../utils/mailer');

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const sendUserToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    secure: !!(process.env.NODE_ENV === 'production'),
    httpOnly: true
  });

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm
  });

  sendUserToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password)
    throw new AppError('Please provide email and password.', 400);

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password, user.password)))
    throw new AppError('Incorrect email or password.', 401);

  sendUserToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization)
    token = req.headers.authorization.replace('Bearer ', '');
  else throw new AppError('You are not logged in.', 401);

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  const currentUser = await User.findById(decoded.id);

  if (!currentUser)
    throw new AppError('The user with that token does not exist.', 401);

  if (currentUser.passwordChangedAfter(decoded.iat))
    throw new AppError(
      'You recently changed your password! Please log in again.',
      401
    );

  req.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    throw new AppError(
      'You do not have the permission to perform this action.',
      403
    );
  }
  next();
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) throw new AppError('Cannot find a user with that email.', 404);

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/auth/reset-password/${resetToken}`;

  const message = `To reset your password, send a PATCH request with your new password and passwordConfirm to ${resetURL}.\nIf you did not request to reset your password, please ignore this email.`;

  try {
    await mailer.sendMail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 minutes).',
      message
    });

    res.status(200).json({
      status: 'success',
      message: 'A password reset token was successfully sent to your email.'
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save({ validateBeforeSave: false });

    throw new AppError(
      'There was an error sending the email. Please try again later.',
      500
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpiresAt: { $gt: Date.now() }
  });

  if (!user)
    throw new AppError('Password reset token is invalid or has expired.', 400);

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();

  sendUserToken(user, 200, res);
});

exports.changePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.comparePassword(req.body.currentPassword, user.password)))
    throw new AppError('Your current password is incorrect.', 400);

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  sendUserToken(user, 200, res);
});
