const express = require('express');
const router = express.Router();
const {
  addProduct,
  getAllProduct,
  adminGetAllProduct,
  getOneProduct,
  adminUpdateOneProduct,
  adminDeleteOneProduct,
  addReview,
  deleteReview,
  getOnlyReviewsForOneProduct,
  
} = require('./../controllers/productController');
const { isLoggedIn, customRole } = require('../middlewares/user');

// user route to get all products
router.route('/products').get(getAllProduct);

// user route to get a single product
router.route('/product/:id').get(getOneProduct);


// add review route
router.route('/review').put(isLoggedIn, addReview);

// delete review route
router.route('/review').delete(isLoggedIn, deleteReview);

// getting reviews for one product route
router.route('/reviews').get(isLoggedIn, getOnlyReviewsForOneProduct);
// in this case, if we want, we can show the reviews to the users who are not loggedIn or not show the reviews to 
// the users who are not loggedIn. Its totally upto us.



// admin route to add a product(only admin is allowed to add products)
router
  .route('/admin/product/add')
  .post(isLoggedIn, customRole('admin'), addProduct);

// admin route to get all product
router
  .route('/admin/products')
  .get(isLoggedIn, customRole('admin'), adminGetAllProduct);

// admin route to update a product
router
  .route('/admin/product/:id')
  .put(isLoggedIn, customRole('admin'), adminUpdateOneProduct);

// admin route to delete a product
router
  .route('/admin/product/:id')
  .delete(isLoggedIn, customRole('admin'), adminDeleteOneProduct);

module.exports = router;
