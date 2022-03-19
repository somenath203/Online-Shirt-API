const User = require('./../models/user');
const BigPromise = require('./../middlewares/bigPromise');
const CustomError = require('./../utils/customError');
const cookieToken = require('../utils/cookieToken');
const cloudinary = require('cloudinary');
const mailHelper = require('./../utils/emailHelper');
const crypto = require('crypto');

// SIGNUP ROUTE

exports.signup = BigPromise(async (req, res, next) => {
  const { name, email, password } = req.body;

  if (!email || !name || !password) {
    return next(new CustomError('name, email and password are required', 400));
  }

  // checking wether the request contains any file or not
  if (!req.files) {
    return next(new CustomError('photo is required for signup', 400));
  }

  let file = req.files.photo;

  const result = await cloudinary.v2.uploader.upload(file.tempFilePath, {
    folder: 'users',
    width: 150,
    crop: 'scale',
  });

  const user = await User.create({
    name,
    email,
    password,
    photo: {
      id: result.public_id,
      secure_url: result.secure_url,
    },
  });

  cookieToken(user, res);
});

// LOGIN ROUTE

exports.login = BigPromise(async (req, res, next) => {
  const { email, password } = req.body;

  // checking wether email and password is present or not
  if (!email || !password) {
    return next(new CustomError('Please provide email and password', 400));
  }

  // finding user in the database based on the email
  const user = await User.findOne({ email }).select('+password');

  // checking wether the user trying to login exists or not
  if (!user) {
    return next(
      new CustomError('Email or password does not match or exists', 400)
    );
  }

  // checking wether the password entered by the user is correct or not
  const isPasswordCorrect = await user.IsValidatedPassword(password);

  // the condition when the password does not matched correctly
  if (!isPasswordCorrect) {
    return next(
      new CustomError('Email or password does not match or exists', 400)
    );
  }

  // if everything is fine, then send a cookie-token to the user who logged in successfully
  cookieToken(user, res);
});

// LOGOUT ROUTE

exports.logout = BigPromise(async (req, res, next) => {
  res.cookie('token', null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: 'logout success',
  });
});

// FORGOT PASSWORD

exports.forgotPassword = BigPromise(async (req, res, next) => {
  const { email } = req.body;

  // checking wether the email exists in our database or not
  const user = await User.findOne({ email });
  if (!user) {
    return next(new CustomError('Email not found as registered', 400));
  }

  const forgotToken = user.getForgotPasswordToken();

  await user.save({ validateBeforeSave: true });

  // sending the forgot-token to the user
  const myUrl = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/password/reset/${forgotToken}`;

  // creating the forgot password url message
  const message = `Copy paste this link in your url and hit enter \n\n ${myUrl}`;

  // sending the forgot-password email to the user who is requesting it
  try {
    await mailHelper({
      email: user.email,
      subject: 'MyTShirtStore - Password Reset Email',
      message,
    });

    res.status(200).json({
      success: true,
      message: 'Email send Successully',
    });
  } catch (error) {
    (user.forgotPasswordToken = undefined),
      (user.forgotPasswordExpiry = undefined);

    await user.save({ validateBeforeSave: true });

    return next(new CustomError(error.message, 500));
  }
});

// RESET PASSWORD

exports.passwordReset = BigPromise(async (req, res, next) => {
  // grabbing the token from the forgotpassword url
  const token = req.params.token;

  // encrypting the token we got from forgotpassword url
  const exncryptedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // trying to find the user who has this exact same token in the database.
  const user = await User.findOne({
    exncryptedToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });

  // checking if the user we are looking for exists or not
  if (!user) {
    return next(new CustomError('Token is invalid or expired', 400));
  }

  // checking wether password and confirm password matches with each other or not
  if (req.body.password !== req.body.confirmPassword) {
    return next(
      new CustomError('Password and Confirm Password do not match', 400)
    );
  }

  // resetting/updating the password
  user.password = req.body.password;

  user.forgotPasswordToken = undefined;
  user.forgotPasswordExpiry = undefined;

  await user.save();

  // sending a token to the user after user has set the password successfully
  cookieToken(user, res);
});

// USER DASHBOARD

exports.getLoggedInUserUserDetails = BigPromise(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    user,
  });
});

// UPDATE THE EXISTING PASSWORD FOR AN USER

exports.changePassword = BigPromise(async (req, res, next) => {
  const userId = req.user.id;

  const user = await User.findById(userId).select('+password');

  const isCorrectOldPassword = await user.IsValidatedPassword(
    req.body.oldPassword
  );

  if (!isCorrectOldPassword) {
    return next(new CustomError('Old password is incorrect', 400));
  }

  user.password = req.body.newPassword;

  await user.save();

  // updating the token
  cookieToken(user, res);
});

// UPDATE THE USER PROFILE
exports.updateUserDetails = BigPromise(async (req, res, next) => {
  // checking for email and name in the body
  if (!req.body.name || !req.body.email) {
    return next(
      new CustomError(
        'email and name is compulsarily required in the body',
        400
      )
    );
  }

  const newData = {
    name: req.body.name,
    email: req.body.email,
  };

  // checking wether the photo is coming-in in the form of request
  if (req.files) {
    const user = await User.findById(req.user.id);

    const imageId = user.photo.id;

    // deleting the old photo stored in cloudinary based on the imageId
    await cloudinary.v2.uploader.destroy(imageId);

    // uploading the new photo which the user has passed us
    const result = await cloudinary.v2.uploader.upload(
      req.files.photo.tempFilePath,
      {
        folder: 'users',
        width: 150,
        crop: 'scale',
      }
    );

    newData.photo = {
      id: result.public_id,
      secure_url: result.secure_url,
    };
  }

  const user = await User.findByIdAndUpdate(req.user.id, newData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
    user,
  });
});

// ADMIN ROUTE
exports.adminAllUser = BigPromise(async (req, res, next) => {
  // returning all users
  const users = await User.find();

  res.status(200).json({
    success: true,
    users,
  });
});

// GETTING A PARTICULAR USER BY ID FROM ADMIN ROUTE
exports.adminGetOneUser = BigPromise(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new CustomError('No user found', 400));
  }

  res.status(200).json({
    success: true,
    user,
  });
});

// ADMIN UPDATING THE PROFILE OF ANY USER
exports.adminUpdateOneUserDetails = BigPromise(async (req, res, next) => {
  // checking for email and name in the body
  if (!req.body.name || !req.body.email) {
    return next(
      new CustomError(
        'email and name is compulsarily required in the body',
        400
      )
    );
  }

  const newData = {
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
  };

  const user = await User.findByIdAndUpdate(req.params.id, newData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
    user,
  });
});

// ADMIN DELETING THE PROFILE OF ANY USER
exports.adminDeleteOneUserDetails = BigPromise(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new CustomError('No such user found', 401));
  }

  // deleting the photo of that particular
  const imageId = user.photo.id;

  await cloudinary.v2.uploader.destroy(imageId);

  // deleting/removing the user
  await user.remove();

  res.status(200).json({
    success: true,
    message: 'user deleted successfully',
  });
});

// MANAGER ROUTE
exports.managerAllUser = BigPromise(async (req, res, next) => {
  const users = await User.find({ role: 'user' });

  res.status(200).json({
    success: true,
    users,
  });
});
