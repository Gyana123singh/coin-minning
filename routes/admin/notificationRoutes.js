const express = require('express');
const router = express.Router();
const { protectAdmin, checkPermission } = require('../../middleware/adminAuth');
const {
  sendNotification,
  sendBulkNotification,
  getAllNotifications,
  deleteNotification,
  deleteUserNotifications,
  getNotificationStats,
  getNotificationTemplates,
} = require('../../controllers/admin/adminNotificationController');

router.use(protectAdmin);

router.get('/stats', getNotificationStats);
router.get('/templates', getNotificationTemplates);

router.route('/')
  .get(getAllNotifications)
  .post(checkPermission('send_notifications'), sendNotification);

router.post('/bulk', checkPermission('send_notifications'), sendBulkNotification);

router.delete('/user/:userId', checkPermission('send_notifications'), deleteUserNotifications);

router.route('/:id')
  .delete(checkPermission('send_notifications'), deleteNotification);

module.exports = router;
