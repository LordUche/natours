const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Please tell us your name.'] },
    email: {
      type: String,
      required: [true, 'Please provide your email.'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email.']
    },
    photo: String,
    password: {
      type: String,
      required: [true, 'Please provide a password.'],
      minlength: [8, 'Password is too short.'],
      select: false
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Please confirm your password.'],
      validate: {
        validator(val) {
          return val === this.password;
        },
        message: "Passwords don't match"
      }
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpiresAt: Date,
    role: {
      type: String,
      enum: {
        values: ['user', 'guide', 'lead-guide', 'admin'],
        message: 'Invalid user role.'
      },
      default: 'user'
    },
    active: {
      type: Boolean,
      default: true,
      select: false
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, returnedUser) {
        delete returnedUser.password;
        delete returnedUser.active;
        delete returnedUser.passwordChangedAt;
      },
      virtuals: true,
      versionKey: false
    },
    toObject: {
      transform(doc, returnedUser) {
        delete returnedUser.password;
        delete returnedUser.active;
        delete returnedUser.passwordChangedAt;
      },
      virtuals: true,
      versionKey: false
    }
  }
);

userSchema.index({ password: 1 });
userSchema.index({ role: 1 });

userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    if (!this.isNew) {
      this.passwordChangedAt = Date.now() - 1000;
    }
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordConfirm = undefined;
  }
  next();
});

userSchema.pre(/^find/, function(next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.comparePassword = async function(password, hash) {
  return await bcrypt.compare(password, hash);
};

userSchema.methods.passwordChangedAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    return JWTTimestamp < this.passwordChangedAt.getTime() / 1000;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetExpiresAt = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
