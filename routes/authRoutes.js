const { Router } = require('express');
const router = Router();
const authController = require('../controllers/authController');
const { checkAuth } = require('../middleware/authMiddleware');


// User Authentication GET Routes
router.get('/user/register', checkAuth, authController.register_get);
router.get('/user/login', checkAuth, authController.login_get);
router.get('/user/logout', authController.logout_get);
router.get('/user/forgot-password', checkAuth, authController.forgotPassword_get);
router.get('/user/reset-password', checkAuth, authController.resetPassword_get);

// User Authentication POST Routes
router.post('/user/register', checkAuth, authController.register_post);
router.post('/user/login', checkAuth, authController.login_post);
router.post('/user/forgot-password', checkAuth, authController.forgotPassword_post);
router.post('/user/reset-password', checkAuth, authController.resetPassword_post);


module.exports = router;