const Product = require('./../models/product');
const BigPromise = require('./../middlewares/bigPromise');
const CustomError = require('./../utils/customError');
const cloudinary = require('cloudinary');
const WhereClause = require('../utils/whereClause');

// ADDING A PRODUCT
exports.addProduct = BigPromise(async (req, res, next) => {

  let imageArray = [];

  if (!req.files) {
    return next(new CustomError('Images are Required!', 401));
  }

  if (req.files) {
    for (let index = 0; index < req.files.photos.length; index++) {
      let result = await cloudinary.v2.uploader.upload(
        req.files.photos[index].tempFilePath,
        {
          folder: 'products',
        }
      );

      imageArray.push({
        id: result.public_id,
        secure_url: result.secure_url,
      });
    }
  }

  req.body.photos = imageArray;

  req.body.user = req.user.id;

  const product = await Product.create(req.body);

  res.status(200).json({
    success: true,
    product,
  });
});

// GETTING ALL PRODUCTS
exports.getAllProduct = BigPromise(async (req, res, next) => {
  const resultPerPage = 6;

  const totalProductCount = await Product.countDocuments();

  const productsObj = new WhereClause(Product.find(), req.query)
    .search()
    .filter();

  let products = await productsObj.base;
  // base is 'Product.find()'

  const filteredProductNumber = products.length;

  productsObj.pager(resultPerPage);

  products = await productsObj.base.clone();

  res.status(200).json({
    success: true,
    products,
    filteredProductNumber,
    totalProductCount,
  });
});

// GETTING A SINGLE PRODUCT
exports.getOneProduct = BigPromise(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new CustomError('No product found with this ID', 401));
  }

  res.status(200).json({
    success: true,
    product,
  });
});

// ADD A REVIEW
exports.addReview = BigPromise(async (req, res, next) => {
  const { rating, comment, productId } = req.body;

  const review = {
    user: req.user._id,
    name: req.user.name,
    rating: Number(rating),
    comment,
  };

  const product = await Product.findById(productId);

  const AlreadyReview = product.reviews.find(
    (rev) => rev.user.toString() === req.user._id.toString()
  );

  if (AlreadyReview) {
    product.reviews.forEach((review) => {
      if (review.user.toString() === req.user._id.toString()) {
        review.comment = comment;
        review.rating = rating;
      }
    });
  } else {
    product.reviews.push(review);

    product.numberOfReviews = product.reviews.length;
  }

  product.ratings =
    product.reviews.reduce((acc, item) => item.rating + acc, 0) /
    product.reviews.length;

  await product.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
  });
});

// getting a review for a particular product
exports.getOnlyReviewsForOneProduct = BigPromise(async (req, res, next) => {
  const product = await Product.findById(req.query.id);

  res.status(200).json({
    success: true,
    reviews: product.reviews
  })
});

// DELETING A REVIEW
exports.deleteReview = BigPromise(async (req, res, next) => {
  const { productId } = req.query;

  const product = await Product.findById(productId);

  const reviews = product.reviews.filter(
    (rev) => rev.user.toString() === req.user._id.toString()
  )

  const numberOfReviews = reviews.length; // updaing number of reviews after deleting a review

  product.ratings =
    product.reviews.reduce((acc, item) => item.rating + acc, 0) /
    product.reviews.length;

  // update the product
  await Product.findByIdAndUpdate(productId, {
    // these are the datas that will be updated
    reviews,
    ratings,
    numberOfReviews
  }, {
    new: true, // it means we want to return new value,
    runValidators: true,
    useFindAndModify: false
  })

  res.status(200).json({
    success: true,
  });
});

// ADMIN GETTING ALL THE PRODUCTS
exports.adminGetAllProduct = BigPromise(async (req, res, next) => {
  const products = await Product.find();

  if (!products) {
    return next(new CustomError('No products available', 401));
  }

  res.status(200).json({
    success: true,
    products,
  });
});

// UPDATING A PRODUCT ALONG WITH THE PHOTO
exports.adminUpdateOneProduct = BigPromise(async (req, res, next) => {
  let product = await Product.findById(req.params.id);

  if (!product) {
    return next(new CustomError('No product found with this id', 401));
  }

  let imagesArray = [];

  if (req.files) {
    for (let index = 0; index < product.photos.length; index++) {
      const res = await cloudinary.v2.uploader.destroy(
        product.photos[index].id
      );
    }

    for (let index = 0; index < req.files.photos.length; index++) {
      let result = await cloudinary.v2.uploader.upload(
        req.files.photos[index].tempFilePath,
        {
          folder: 'products',
        }
      );

      imagesArray.push({
        id: result.public_id,
        secure_url: result.secure_url,
      });
    }
  }

  req.body.photos = imagesArray;

  product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
    product,
  });
});



// DELETING A PRODUCT
exports.adminDeleteOneProduct = BigPromise(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new CustomError('No product found with this ID', 401));
  }

  for (let index = 0; index < product.photos.length; index++) {
    await cloudinary.v2.uploader.destroy(product.photos[index].id);
  }

  await product.remove();

  res.status(200).json({
    success: true,
    message: 'Product deleted successfully',
  });
});
