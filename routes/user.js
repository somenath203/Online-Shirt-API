const express = require('express');
const router = express.Router();
const { isLoggedIn, customRole } = require('../middlewares/user');

const {
  signup,
  login,
  logout,
  forgotPassword,
  passwordReset,
  getLoggedInUserUserDetails,
  changePassword,
  updateUserDetails,
  adminAllUser,
  managerAllUser,
  adminGetOneUser,
  adminUpdateOneUserDetails,
  adminDeleteOneUserDetails,
} = require('../controllers/userController');

router.route('/signup').post(signup);
router.route('/login').post(login);
router.route('/logout').get(logout);
router.route('/forgotPassword').post(forgotPassword);
router.route('/password/reset/:token').post(passwordReset);
router.route('/userdashboard').get(isLoggedIn, getLoggedInUserUserDetails);
router.route('/password/update').post(isLoggedIn, changePassword);
router.route('/userdashboard/update').post(isLoggedIn, updateUserDetails);

router.route('/admin/users').get(isLoggedIn, customRole('admin'), adminAllUser);
router.route('/admin/user/:id').get(isLoggedIn, customRole('admin'), adminGetOneUser);
router.route('/admin/user/:id').put(isLoggedIn, customRole('admin'), adminUpdateOneUserDetails);
router.route('/admin/user/:id').delete(isLoggedIn, customRole('admin'), adminDeleteOneUserDetails);

router.route('/manager/users').get(isLoggedIn, customRole('manager'), managerAllUser);

module.exports = router;
