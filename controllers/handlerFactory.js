const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

exports.createOne = Model =>
  catchAsync(async (req, res, next) => {
    const newDoc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: newDoc
    });
  });

exports.getAll = Model =>
  catchAsync(async (req, res, next) => {
    const docs = await new APIFeatures(Model.find(), req.query).query;

    res.status(200).json({
      status: 'success',
      result: docs.length,
      data: docs
    });
  });

exports.getOne = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (populateOptions) query = query.populate(populateOptions);

    const doc = await query;

    if (!doc) throw new AppError('Cannot find document with that ID.', 404);

    res.status(200).json({
      status: 'success',
      data: doc
    });
  });

exports.updateOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!doc) throw new AppError('Cannot find document with that ID.', 404);

    res.status(200).json({
      status: 'success',
      data: doc
    });
  });

exports.deleteOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) throw new AppError('Cannot find document with that ID.', 404);

    res.status(204).end();
  });
