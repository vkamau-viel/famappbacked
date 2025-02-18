const express = require('express');
const familyUserController = require('../controllers/familyUserController');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');

// check if member is  user
router.get('/:memberId/is-member-user', familyUserController.isMemberAUser);

// get user families
router.get('/:userId/user-families', familyUserController.getUserFamilies);

// request to join family
router.post('/:familyId/join-family', authMiddleware, familyUserController.joinFamily);

// get family members
router.get('/:familyId/users', familyUserController.getFamilyUsers);

// update user
router.put('/:userId/:familyId/update-user', authMiddleware, familyUserController.updateUserRoleOrStatus);
// get user status
router.get('/:familyId/user-status', authMiddleware, familyUserController.getUserStatus);

module.exports = router;