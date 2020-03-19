const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

const filterObj = (obj, ...allowedFields) => {
  return Object.keys(obj).reduce((acc, el) => {
    if (allowedFields.includes(el)) {
      acc[el] = obj[el];
    }
    return acc;
  }, {});
};

exports.setMyId = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    throw new AppError(
      'This route is not for password updates. Please use /change-password.',
      400
    );
  }

  const filtered = filterObj(req.body, 'name', 'email');

  const user = await User.findByIdAndUpdate(req.user.id, filtered, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).end();
});

exports.createUser = catchAsync(async (req, res, next) => {
  res
    .status(500)
    .json('This route is not defined! Please use /auth/signup instead.');
});

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
