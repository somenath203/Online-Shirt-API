const Order = require('../models/order');
const Product = require('../models/product');
const BigPromise = require('../middlewares/bigPromise');
const CustomError = require('../utils/customError');

// CREATING ONE ORDER
exports.createOrder = BigPromise(async (req, res, next) => {
  const {
    shippingInfo,
    orderItems,
    paymentInfo,
    taxAmount,
    shippingAmount,
    totalAmount,
  } = req.body;

  const order = await Order.create({
    shippingInfo,
    orderItems,
    paymentInfo,
    taxAmount,
    shippingAmount,
    totalAmount,
    user: req.user._id,
  });

  res.status(200).json({
    success: true,
    order,
  });
});

// GETTING A PARTICULAR ORDER
exports.getOneOrder = BigPromise(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate(
    'user',
    'name email'
  );

  if (!order) {
    return next(new CustomError('please check order ID', 401));
  }

  res.status(200).json({
    request: true,
    order,
  });
});

// GETTING ALL THE ORDERS OF A PARTICULAR USER WHO IS ALREADY LOGGED IN
exports.getLoggedInOrders = BigPromise(async (req, res, next) => {
  const order = await Order.find({ user: req.user._id });

  if (!order) {
    return next(new CustomError('please check order ID', 401));
  }

  res.status(200).json({
    request: true,
    order,
  });
});

// ADMIN GETTING ALL ORDERS
exports.adminGetAllOrders = BigPromise(async (req, res, next) => {
  const orders = await Order.find();

  res.status(200).json({
    request: true,
    orders,
  });

});


// UPDATING ORDER BY ADMIN

exports.adminUpdateOrder = BigPromise(async (req, res, next) => {

  const order = await Order.findById(req.params.id);

  if(order.orderStatus === 'Delivered') {
    return next(new CustomError('Order is already delivered', 401));
  }

  order.orderStatus = req.body.orderStatus;

  order.orderItems.forEach(async prod => {
    await updateProductStock(prod.product, prod.quantity); 
  });

  await order.save();

  res.status(200).json({
    success: true
  });
  
});

// DELETE AN ORDER BY ADMIN
exports.adminDeleteOrder = BigPromise(async (req, res, next) => {

  const order = await Order.findById(req.params.id);

  await order.remove();

  res.status(200).json({
    success: true
  })

});

// UPDATING THE STOCK ONCE THE PRODUCT IS DELIVERED
async function updateProductStock(productId, quantity) {

  const product = await Product.findById(productId);

  product.stock = product.stock - quantity;

  await product.save({validateBeforeSave: false});

}