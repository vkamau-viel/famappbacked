const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const relativeController = require('../controllers/relativeController');

// Define routes and link them to the controller functions
router.get('/:memberId/parents', relativeController.parents);
router.get('/:memberId/spouses', relativeController.spouses);
router.get('/:memberId/grand-parents', relativeController.grandParents);
router.get('/:memberId/children', relativeController.children);
router.get('/:memberId/siblings', relativeController.siblings);
router.get('/:memberId/cousins', relativeController.cousins);
router.get('/:memberId/great-grand-parents', relativeController.greatGrandParents);
router.get('/:memberId/uncles-and-anties', relativeController.unclesAndAunties);
router.get('/:memberId/grandchildren', relativeController.grandChildren);
router.get('/:memberId/great-grand-children', relativeController.greatGrandChildren);
router.get('/:memberId/second-cousins', relativeController.secondCousins);
router.get('/:memberId/ancestors', relativeController.ancestors);
router.get('/:memberId/descendants', relativeController.descendants);
router.get('/:familyId/family-tree', relativeController.familyTree);
router.get('/:memberId/spouses', relativeController.spouses);
router.get('/:memberId/oldest-member-descendants', relativeController.oldestMemberDescendants);
module.exports = router;