const express = require('express');
const memberController = require('../controllers/memberController');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');

// Multer configuration for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  });
  const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png/;
      const mimeType = allowedTypes.test(file.mimetype);
      const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      if (mimeType && extName) {
        return cb(null, true);
      }
      cb('Error: File upload only supports the following filetypes - ' + allowedTypes);
    },
  });

// Route to add a member to a family
//router.post('/add-member', authMiddleware, memberController.addMemberToFamily);
// Add a new family member
router.post('/:familyId/add-member', authMiddleware, upload.single('memberImage'), memberController.addMember);
// Routes for member actions
router.get('/:memberId', memberController.getMemberDetails); // Fetch member details
router.get('/:memberId/relationships', memberController.getRelationships); // Fetch member relationships
router.get('/:memberId/descendants', memberController.getDescendants); // Fetch member descendants
router.get('/:memberId/ancestors', memberController.getAncestors); // Fetch member ancestors
router.get('/:memberId/familytree', memberController.getFamilyTree); // Fetch family tree

// Update member details
//router.put('/:memberId/update', memberController.updateMember);
// Update member route with image upload
router.put('/:memberId', authMiddleware, upload.single('memberImage'), memberController.updateMember);

// Remove member
router.delete('/:memberId', authMiddleware, memberController.deleteMember);

// Verify member
router.post('/verify-member', authMiddleware, memberController.verifyMember);
router.get('/:verifiedMemberId/:familyId', authMiddleware, memberController.getMemberVerifications);

// Report a member
router.post('/:familyId/report', authMiddleware, memberController.reportMember);

// Invite a member via email
router.post('/email-invite', memberController.sendInviteEmail);

module.exports = router;