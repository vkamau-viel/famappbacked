const express = require('express');
const router = express.Router();
const familyController = require('../controllers/familyController');
const authMiddleware = require('../middleware/authMiddleware');

// Route to get family names
router.get('/families', familyController.getFamilyNames);
router.post('/families', authMiddleware, familyController.createFamily);
router.get('/search', familyController.searchFamilies)
router.delete('/:familyId/delete', authMiddleware, familyController.deleteFamily);
// Get a family by ID (including members and relationships)
router.get('/family/:familyId', familyController.getFamilyById);

// Get all members of a family
router.get('/:familyId/members', familyController.getMembersByFamilyId);

// Get all relationships of a family
router.get('/:familyId/relationships', familyController.getRelationshipsByFamilyId);

// Add a new member to a family
router.post('/:familyId/members', familyController.addMember);

// Add a new relationship to the family
router.post('/:familyId/relationships', familyController.addRelationship);

// Delete a member from a family
router.delete('/:familyId/members/:memberId', familyController.deleteMember);

// Delete a relationship
router.delete('/relationships/:relationshipId', familyController.deleteRelationship);

// update family
router.put('/update-family', authMiddleware, familyController.updateFamily);

// report family
router.post('/:familyId/report-family', authMiddleware, familyController.reportFamily);

//get family by familyId
router.get ('/:familyId/family-data', familyController.getFamilyByFamilyId);

//get family tree data
router.get('/:familyId/family-tree', familyController.familyTreeData);

//get family statistics
router.get('/:familyId/family-stats', familyController.familyStats);

module.exports = router;
