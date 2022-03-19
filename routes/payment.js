const express = require('express');
const router = express.Router();
const {
  sendStripeKey,
  sendRazorpayKey,
  captureStripePayment,
  captureRazorpayPayment,
} = require('./../controllers/paymentController');
const { isLoggedIn } = require('../middlewares/user');

// sending stripe key route
router.route('/stripekey').get(isLoggedIn, sendStripeKey);

// sending razorpay key route
router.route('/razorpaykey').get(isLoggedIn, sendRazorpayKey);



// processing payment in stripe route
router.route('/capturestripe').post(isLoggedIn, captureStripePayment);

// processing payment in razorpay route
router.route('/capturerazorpay').post(isLoggedIn, captureRazorpayPayment);


module.exports = router;
