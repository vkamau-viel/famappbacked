const express = require('express');
const relationshipController = require('../controllers/relationshipController');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// Get relationships for a specific member
router.get('/:selectedMemberId', relationshipController.getRelationships);

// Add a new relationship
router.post('/:familyId', relationshipController.addRelationship);

// Remove a relationship
router.delete('/:relationshipId', authMiddleware, relationshipController.deleteRelationship);

// verify relationship
router.post('/:relationshipId/:familyId/verify', authMiddleware, relationshipController.verifyRelationship);

module.exports = router;