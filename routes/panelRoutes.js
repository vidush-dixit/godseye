const { Router } = require('express');
const router = Router();
const panelController = require('../controllers/panelController');
const { requireAuth, checkUser } = require('../middleware/authMiddleware');


// Dashboard GET Routes
router.get('/panel/dashboard', requireAuth, checkUser, panelController.dashboard_get);
router.get('/panel/profile', requireAuth, checkUser, panelController.profile_get);
router.get('/panel/manage-users', requireAuth, checkUser, panelController.manageUsers_get);
router.get('/panel/analytics', requireAuth, checkUser, panelController.analytics_get);


// Dashboard PATCH Routes
router.patch('/panel/change-password', requireAuth, panelController.changeUserPassword_patch);
router.patch('/panel/approveUser', requireAuth, panelController.approveUser_patch);
router.patch('/panel/deleteUser', requireAuth, panelController.deleteUser_patch);


module.exports = router;