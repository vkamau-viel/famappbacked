const { models } = require('../models'); 
const { Relationship, Member } = models; // Sequelize models
const { Op } = require('sequelize'); // Import Sequelize operators

// Helper function to fetch relationships
const fetchRelationships = async (memberId, relationshipTypes) => {
  try {
    const relationships = await Relationship.findAll({
      where: {
        memberId: memberId,
        relationshipType: { [Op.in]: relationshipTypes }, // Query based on relationship types
      },
      include: [{ model: Member, as: 'RelatedMember' }],
    });

    // Format the response
    return relationships.map((rel) => ({
      id: rel.RelatedMember.id,
      firstName: rel.RelatedMember.firstName,
      middleName: rel.RelatedMember.middleName,
      lastName: rel.RelatedMember.lastName,
      nickName: rel.RelatedMember.nickName,
      dobQualifier: rel.RelatedMember.dobQualifier,
      dateOfBirth: rel.RelatedMember.dateOfBirth,
      dateOfDeath: rel.RelatedMember.dateOfDeath,
      dodQualifier: rel.RelatedMember.dodQualifier,
      email: rel.RelatedMember.email,
      description: rel.RelatedMember.description,
      phoneNumber: rel.RelatedMember.phoneNumber,
      gender: rel.RelatedMember.gender,
      relationType: rel.relationshipType, // Pass the specific relationship type
      memberImage: rel.RelatedMember.memberImage,
    }));
  } catch (error) {
    console.error(`Error fetching relationships (${relationshipTypes}):`, error);
    throw new Error('Error fetching relationships');
  }
};

// Helper function to fetch Children
const fetchChildren = async (memberId, relationshipTypes) => {
    try {
      // Fetch children where the current member is a parent (father/mother)
      const children = await Relationship.findAll({
        where: {
          relatedMemberId: memberId,
          relationshipType: { [Op.in]: relationshipTypes }, // Parent roles
        },
        include: [{ model: Member, as: 'Member' }], // Ensure 'Member' is the alias in your model associations
      });
  
      // Format the response
      return children.map((child) => ({
        id: child.Member.id,
        firstName: child.Member.firstName,
        middleName: child.Member.middleName,
        lastName: child.Member.lastName,
        nickName: child.Member.nickName,
        dobQualifier: child.Member.dobQualifier,
        dateOfBirth: child.Member.dateOfBirth,
        dateOfDeath: child.Member.dateOfDeath,
        dodQualifier: child.Member.dodQualifier,
        email: child.Member.email,
        description: child.Member.description,
        phoneNumber: child.Member.phoneNumber,
        gender: child.Member.gender,
        relationType: child.relationshipType, // Reflects if the current member is their father or mother
        memberImage: child.Member.memberImage,
      }));
    } catch (error) {
      console.error(`Error fetching children for memberId ${memberId}:`, error);
      throw new Error('Error fetching children');
    }
  };
  

// Controller for parents
exports.parents = async (req, res) => {
  const { memberId } = req.params;

  try {
    const parents = await fetchRelationships(memberId, ['father', 'mother']);
    return res.status(200).json({ parents, parentsCount: parents.length });
  } catch (error) {
    console.error('Error fetching parents:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Controller for children
exports.children = async (req, res) => {
    const { memberId } = req.params;
  
    try {
      const children = await fetchChildren(memberId, ['father', 'mother']);
      console.log('Children fetched successfully:', JSON.stringify(children, null, 2));
      return res.status(200).json({ children, childrenCount: children.length });
    } catch (error) {
      console.error('Error fetching children:', error.message || error);
      return res.status(500).json({ error: error.message || 'Server error' });
    }
  };

// controller for grandchildren
exports.grandChildren = async (req, res) => {
    const { memberId } = req.params;
  
    try {
      const children = await fetchChildren(memberId, ['father', 'mother']);
      console.log(' children found:', children)
      console.log('Fetched parents:', JSON.stringify(children, null, 2));
      //return res.status(200).json({ parents, parentsCount: parents.length });
  // Extract parent IDs with a safety check
      const childrenIds = children.map((child) => child.id)
  
      if (childrenIds.length === 0) {
      return res.status(404).json({ message: 'No parents found, hence no grandparents.' });
      }
  
      const grandchildren = await fetchChildren(childrenIds, ['father', 'mother']);
      console.log('grand parents found:', grandchildren)
      return res.status(200).json({ grandchildren, grandchildrenCount: grandchildren.length});
      
    } catch (error) {
      console.error('Error fetching grandchildren:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  };
  

// Controller for spouses
exports.spouses = async (req, res) => {
  const { memberId } = req.params;

  try {
    const spouses = await fetchRelationships(memberId, ['wife', 'husband']);
    return res.status(200).json({ spouses, spousesCount: spouses.length });
  } catch (error) {
    console.error('Error fetching spouses:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

// siblings
const fetchSiblings = async (memberId) => {
    try {
      // Step 1: Fetch the parents of the member
      const parents = await fetchRelationships(memberId, ['father', 'mother']);
      const parentIds = parents.map((parent) => parent.id);
  
      if (parentIds.length === 0) {
        // No parents found, so no siblings
        return [];
      }
  
      // Step 2: Fetch children of the parents
      const siblings = await Promise.all(
        parentIds.map((parentId) => fetchChildren(parentId, ['father', 'mother']))
      );
  
      // Flatten the siblings list from multiple parents
      const allSiblings = siblings.flat();
  
      // Step 3: Remove the current member and duplicates
      const uniqueSiblings = Array.from(
        new Map(
          allSiblings
            .filter((sibling) => sibling.id.toString() !== memberId.toString()) // Exclude current member
            .map((sibling) => [sibling.id, sibling]) // Map siblings by ID
        ).values()
      );
  
      return uniqueSiblings;
    } catch (error) {
      console.error(`Error fetching siblings for memberId ${memberId}:`, error);
      throw new Error('Error fetching siblings');
    }
  };
    
  
// Controller for siblings
exports.siblings = async (req, res) => {
    const { memberId } = req.params;
  
    try {
      const siblings = await fetchSiblings(memberId);
      return res.status(200).json({ siblings, siblingsCount: siblings.length });
    } catch (error) {
      console.error('Error fetching siblings:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  };
  

// helper for cousins
const fetchCousins = async (memberId) => {
    try {
      // Step 1: Find the member's parents (father and mother)
      const parents = await fetchRelationships(memberId, ['father', 'mother']);
      const parentIds = parents.map((parent) => parent.id);
  
      if (parentIds.length === 0) {
        return []; // No parents found, hence no cousins
      }
  
      // Step 2: Find the member’s grandparents (the parents of the member’s parents)
      const grandparents = await fetchRelationships(parentIds, ['father', 'mother']);
      const grandparentIds = grandparents.map((grandparent) => grandparent.id);
  
      if (grandparentIds.length === 0) {
        return []; // No grandparents found, hence no cousins
      }
  
      // Step 3: Find the siblings of the grandparents (aunties and uncles)
      const auntAndUncleRelationships = await fetchChildren(grandparentIds, ['father', 'mother']);
      let auntAndUncleIds = auntAndUncleRelationships.map((auntOrUncle) => auntOrUncle.id);
  
      // Step 4: Exclude the member's parents from the aunt and uncle list
      auntAndUncleIds = auntAndUncleIds.filter(id => !parentIds.includes(id));
  
      if (auntAndUncleIds.length === 0) {
        return []; // No aunts or uncles found after exclusion
      }
  
      // Step 5: Find the children of the remaining aunties and uncles (cousins)
      const cousins = await fetchChildren(auntAndUncleIds, ['father', 'mother']);
  
      // Filter out the member's siblings to exclude them from cousins
      const filteredCousins = cousins.filter(cousin => 
        !parentIds.includes(cousin.id) // Exclude the siblings
      );
  
      return filteredCousins;
    } catch (error) {
      console.error('Error fetching cousins:', error);
      return [];
    }
  };
  
  // Controller for cousins
  exports.cousins = async (req, res) => {
    const { memberId } = req.params;
  
    try {
      const cousins = await fetchCousins(memberId);
      return res.status(200).json({ cousins, cousinsCount: cousins.length });
    } catch (error) {
      console.error('Error fetching cousins:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  };

// Second Cousins
const fetchSecondCousins = async (memberId) => {
    try {
      // Step 1: Find the member's parents (father and mother)
      const parents = await fetchRelationships(memberId, ['father', 'mother']);
      const parentIds = parents.map((parent) => parent.id);
  
      if (parentIds.length === 0) {
        return []; // No parents found, hence no cousins
      }
  
      // Step 2: Find the member’s grandparents (the parents of the member’s parents)
      const grandparents = await fetchRelationships(parentIds, ['father', 'mother']);
      const grandparentIds = grandparents.map((grandparent) => grandparent.id);
  
      if (grandparentIds.length === 0) {
        return []; // No grandparents found, hence no cousins
      }
  
      // Step 3: Find the member's great grandparents ( the parents of members grandparents)
      const greatGrandparents = await fetchRelationships(grandparentIds, ['father', 'mother']);
      const greatGrandparentIds = greatGrandparents.map((greatGrandparent) => greatGrandparent.id);
      
      // Step 4: Find the siblings of the grandparents (grandaunties and uncles)
      const grandAuntAndUncleRelationships = await fetchChildren(greatGrandparentIds, ['father', 'mother']);
      let grandAuntAndUncleIds = grandAuntAndUncleRelationships.map((grandAuntOfUncle) => grandAuntOfUncle.id);

      // Step 4a: Exclude the member's grandparents from the grandaunt and granduncle list
      grandAuntAndUncleIds = grandAuntAndUncleIds.filter(id => !grandparentIds.includes(id));

      // Step 5 Find the cousins of members parents
      const auntAndUncleRelationships = await fetchChildren(grandAuntAndUncleIds, ['father', 'mother']);
      let auntAndUncleIds = auntAndUncleRelationships.map((auntOrUncle) => auntOrUncle.id);
  
      // Step 5a: Exclude the member's parents from the aunt and uncle list
      //auntAndUncleIds = auntAndUncleIds.filter(id => !parentIds.includes(id));
  
      /*if (auntAndUncleIds.length === 0) {
        return []; // No aunts or uncles found after exclusion
      }*/
  
      // Step 5: Find the children of the remaining aunties and uncles (cousins)
      const secondCousins = await fetchChildren(auntAndUncleIds, ['father', 'mother']);
  
      // Filter out the member's siblings to exclude them from cousins
      const filteredSecondCousins = secondCousins.filter(secondCousin => 
        !parentIds.includes(secondCousin.id) // Exclude the siblings
      );
  
      return filteredSecondCousins;
    } catch (error) {
      console.error('Error fetching second cousins:', error);
      return [];
    }
  };
  
  // Controller for cousins
  exports.secondCousins = async (req, res) => {
    const { memberId } = req.params;
  
    try {
      const secondCousins = await fetchSecondCousins(memberId);
      return res.status(200).json({ secondCousins, cousinsCount: secondCousins.length });
    } catch (error) {
      console.error('Error fetching secondCousins:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  };
  

// Controller for grandparents
exports.grandParents = async (req, res) => {
  const { memberId } = req.params;

  try {
    const parents = await fetchRelationships(memberId, ['father', 'mother']);
    console.log(' parents found:', parents)
    console.log('Fetched parents:', JSON.stringify(parents, null, 2));
    //return res.status(200).json({ parents, parentsCount: parents.length });
// Extract parent IDs with a safety check
    const parentIds = parents.map((parent) => parent.id)

    if (parentIds.length === 0) {
    return res.status(404).json({ message: 'No parents found, hence no grandparents.' });
    }

    const grandparents = await fetchRelationships(parentIds, ['father', 'mother']);
    console.log('grand parents found:', grandparents)
    return res.status(200).json({ grandparents, grandparentsCount: grandparents.length});
    
  } catch (error) {
    console.error('Error fetching grandparents:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Controller for great-grandparents
exports.greatGrandParents = async (req, res) => {
    const { memberId } = req.params;
  
    try {
      const parents = await fetchRelationships(memberId, ['father', 'mother']);
      console.log(' parents found:', parents)
      console.log('Fetched parents:', JSON.stringify(parents, null, 2));
      //return res.status(200).json({ parents, parentsCount: parents.length });
  // Extract parent IDs with a safety check
      const parentIds = parents.map((parent) => parent.id)
  
      /*if (parentIds.length === 0) {
      return res.status(404).json({ message: 'No parents found, hence no grandparents.' });
      }*/
  
      const grandparents = await fetchRelationships(parentIds, ['father', 'mother']);
      console.log('grand parents found:', grandparents)
      const grandparentIds = grandparents.map((grandparent) => grandparent.id)

      const greatGrandparents = await fetchRelationships(grandparentIds, ['father', 'mother']);
      return res.status(200).json({ greatGrandparents, greatGrandparentsCount: greatGrandparents.length});
      
    } catch (error) {
      console.error('Error fetching greatGrandparents:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  };
  
// Controller for great-grandparents
exports.greatGrandChildren = async (req, res) => {
    const { memberId } = req.params;
  
    try {
      const children = await fetchChildren(memberId, ['father', 'mother']);
      console.log(' children found:', children)
      console.log('Fetched children:', JSON.stringify(children, null, 2));
      //return res.status(200).json({ parents, parentsCount: parents.length });
  // Extract parent IDs with a safety check
      const childrenIds = children.map((child) => child.id)
  
      if (childrenIds.length === 0) {
      return res.status(404).json({ message: 'No children found, hence no grandchildren.' });
      }
  
      const grandchildren = await fetchChildren(childrenIds, ['father', 'mother']);
      console.log('grand parents found:', grandchildren)
      const grandchildrenIds = grandchildren.map((grandchild) => grandchild.id)

      const greatGrandchildren = await fetchChildren(grandchildrenIds, ['father', 'mother']);
      return res.status(200).json({ greatGrandchildren, greatGrandchildrenCount: greatGrandchildren.length});
      
    } catch (error) {
      console.error('Error fetching greatGrandchildren:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  };

  // Controller for fetching uncles and aunties
  exports.unclesAndAunties = async (req, res) => {
    const { memberId } = req.params;
  
    try {
      // Step 1: Find the member's parents (father and mother)
      const parents = await fetchRelationships(memberId, ['father', 'mother']);
      const parentIds = parents.map((parent) => parent.id);
  
      /*if (parentIds.length === 0) {
        return res.status(404).json({ message: 'No parents found for this member.' });
      }*/
  
      // Step 2: Find the member’s grandparents (the parents of the member’s parents)
      const grandparents = await fetchRelationships(parentIds, ['father', 'mother']);
      const grandparentIds = grandparents.map((grandparent) => grandparent.id);
  
      if (grandparentIds.length === 0) {
        return res.status(404).json({ message: 'No grandparents found for this member.' });
      }
  
      // Step 3: Find the siblings of the grandparents (uncles and aunties)
      const siblingsOfGrandparents = await fetchChildren(grandparentIds, ['father', 'mother']);
  
      // Step 4: Filter out the member's parents from the list of uncles and aunties
      const unclesAndAunties = siblingsOfGrandparents.filter(
        (sibling) => !parentIds.includes(sibling.id)
      );
  
      // Step 5: Remove duplicates based on the 'id' property
      const uniqueUnclesAndAunties = unclesAndAunties.filter(
        (value, index, self) => index === self.findIndex((t) => t.id === value.id)
      );
  
      // Return the unique uncles and aunties
      console.log('Piblings:', unclesAndAunties)
      return res.status(200).json({
        unclesAndAunties: uniqueUnclesAndAunties,
        unclesAndAuntiesCount: uniqueUnclesAndAunties.length,
      });
    } catch (error) {
      console.error('Error fetching uncles and aunties:', error);
      return res.status(500).json({ error: 'Server error while fetching uncles and aunties' });
    }
  };

// Function to retrieve ancestors and count them
const getAncestors = async (memberId, level = 1) => {
  if (level > 5) return { ancestors: [], count: 0 }; // Limiting to 5 levels

  try {
    // Find parents of the current member
    const parentRelationships = await Relationship.findAll({
      where: {
        memberId,
        relationshipType: { [Op.in]: ['father', 'mother'] }, // Use Sequelize Op.in for multiple conditions
      },
      include: [{
        model: Member,
        as: 'RelatedMember', // Ensure this alias matches the Sequelize association
      }],
    });

    // Retrieve details of the parents
    const parents = parentRelationships.map(rel => ({
      id: rel.RelatedMember.id,
      firstName: rel.RelatedMember.firstName,
      middleName: rel.RelatedMember.middleName,
      nickName: rel.RelatedMember.nickName,
      lastName: rel.RelatedMember.lastName,
      dateOfBirth: rel.RelatedMember.dateOfBirth,
      email: rel.RelatedMember.email,
      phoneNumber: rel.RelatedMember.phoneNumber,
      gender: rel.relationshipType === 'father' ? 'male' : 'female',
      memberImage: rel.RelatedMember.memberImage, // Fixed property name
      relationType: rel.relationshipType,
      parents: [], // Placeholder for grandparents
    }));

    let totalAncestors = parents.length; // Count the parents as ancestors

    // Recursive call to find ancestors of each parent
    for (const parent of parents) {
      const { ancestors: grandparents, count } = await getAncestors(parent.id, level + 1);
      parent.parents = grandparents;
      totalAncestors += count; // Add grandparents to the count
    }

    return { ancestors: parents, count: totalAncestors };
  } catch (error) {
    console.error(`Error retrieving ancestors at level ${level} for memberId ${memberId}:`, error);
    throw error; // Rethrow the error to be handled by the caller
  }
};

// Route to retrieve all ancestors of a member and their count
exports.ancestors = async (req, res) => {
  const { memberId } = req.params;

  if (!memberId) {
    return res.status(400).json({ error: 'Member ID is required' });
  }

  try {
    const { ancestors, count } = await getAncestors(memberId);
    console.log('Ancestors count:', count);
    console.log('Ancestors:', JSON.stringify(ancestors, null, 2));
    return res.status(200).json({ ancestors, count });
  } catch (error) {
    console.error('Error retrieving ancestors:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

const getDescendants = async (memberId, level = 1) => {
  if (level > 5) return { descendants: [], count: 0 }; // Limiting to 5 levels (children, grandchildren, great-grandchildren)

  // Find children of the current member
  const childrenRelationships = await Relationship.findAll({
    where: {
      relatedMemberId: memberId,
      relationshipType: ['father', 'mother']
    },
    include: [{
      model: Member,
      as: 'Member',  // The children
    }]
  });

  // Retrieve details of the children
  const children = childrenRelationships.map(rel => ({
    id: rel.Member.id,
    firstName: rel.Member.firstName,
    middleName: rel.Member.middleName,
    lastName: rel.Member.lastName,
    nickName: rel.Member.nickName,
    dateOfBirth: rel.Member.dateOfBirth,
    email: rel.Member.email,
    phoneNumber: rel.Member.phoneNumber,
    gender: rel.Member.gender,
    dateOfBirth: rel.Member.dateOfBirth,
    memberImage: rel.Member.memberImage,
    relationType: rel.relationshipType,
    children: [], // Placeholder for grandchildren
    spouse: null // Placeholder for spouse
  }));

  let totalDescendants = children.length; // Count the children as descendants

  // Fetch spouses for each child and include them
  for (let child of children) {
    const spouseRelationship = await Relationship.findOne({
      where: {
        relationshipType: 'spouse',
        [Op.or]: [
          { memberId: child.id },
          { relatedMemberId: child.id },
        ],
      },
      include: [
        {
          model: Member,
          as: 'Member',  // The member (could be the spouse)
        },
        {
          model: Member,
          as: 'RelatedMember',  // The related member (could be the spouse)
        }
      ]
    });

    console.log('spouseRelationship:', spouseRelationship);

    // Assign the spouse (if found)
    if (spouseRelationship) {
      if (spouseRelationship.Member && spouseRelationship.Member.id !== child.id) {
        child.spouse = {
          id: spouseRelationship.Member.id,
          firstName: spouseRelationship.Member.firstName,
          middleName: spouseRelationship.Member.middleName,
          lastName: spouseRelationship.Member.lastName,
          memberImage: spouseRelationship.Member.memberImage,
          gender: spouseRelationship.Member.gender,
          dateOfBirth: spouseRelationship.Member.dateOfBirth,
          email: spouseRelationship.Member.email,
          phoneNumber: spouseRelationship.Member.phoneNumber,
        };
      } else if (spouseRelationship.RelatedMember && spouseRelationship.RelatedMember.id !== child.id) {
        child.spouse = {
          id: spouseRelationship.RelatedMember.id,
          firstName: spouseRelationship.RelatedMember.firstName,
          middleName: spouseRelationship.RelatedMember.middleName,
          lastName: spouseRelationship.RelatedMember.lastName,
          memberImage: spouseRelationship.RelatedMember.memberImage,
          gender: spouseRelationship.RelatedMember.gender,
          dateOfBirth: spouseRelationship.RelatedMember.dateOfBirth,
          email: spouseRelationship.RelatedMember.email,
          phoneNumber: spouseRelationship.RelatedMember.phoneNumber,
        };
      }
    }

    // Recursive call to find descendants of each child (i.e., grandchildren)
    const { descendants: grandchildren, count } = await getDescendants(child.id, level + 1);
    child.children = grandchildren;
    totalDescendants += count; // Add grandchildren to the count
  }

  return { descendants: children, count: totalDescendants };
};


/*const getDescendants = async (memberId, level = 1) => {
  if (level > 5) return { descendants: [], count: 0 }; // Limiting to 3 levels (children, grandchildren, great-grandchildren)

  // Find children of the current member
  const childrenRelationships = await Relationship.findAll({
    where: {
      relatedMemberId: memberId,
      relationshipType: ['father', 'mother']
    },
    include: [{
      model: Member,
      as: 'Member',  // The children
    }]
  });

  // Retrieve details of the children
  const children = childrenRelationships.map(rel => ({
    id: rel.Member.id,
    firstName: rel.Member.firstName,
    middleName: rel.Member.middleName,
    lastName: rel.Member.lastName,
    nickName: rel.Member.nickName,
    dateOfBirth: rel.Member.dateOfBirth,
    email: rel.Member.email,
    phoneNumber: rel.Member.phoneNumber,
    gender: rel.Member.gender,
    memberImage: rel.Member.memberImage,
    relationType: rel.relationshipType,
    children: [] // Placeholder for grandchildren
  }));

  let totalDescendants = children.length; // Count the children as descendants

  // Recursive call to find descendants of each child
  for (let child of children) {
    const { descendants: grandchildren, count } = await getDescendants(child.id, level + 1);
    child.children = grandchildren;
    totalDescendants += count; // Add grandchildren to the count
  }

  return { descendants: children, count: totalDescendants };
};*/

// Route to retrieve all descendants of a member and their count
exports.descendants = async (req, res) => {
  const { memberId } = req.params;

  try {
    const { descendants, count } = await getDescendants(memberId);
    console.log('descendants count:', count)
    console.log('descendants:', descendants)
    return res.status(200).json({ descendants, count });
  } catch (error) {
    console.error('Error retrieving descendants:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Function to build the family tree
// Utility function to fetch descendants recursively
const getDescendantsRecursive = async (memberId, familyId) => {
  // Get direct children (Father/Mother relationships)
  const childrenRelations = await Relationship.findAll({
      where: {
          relatedMemberId: memberId,
          relationshipType: { [Op.or]: ['father', 'mother'] }
      },
      include: [{ model: Member, as: 'Member' }]
  });
  console.log('childrenRelations:', childrenRelations)

  let descendants = [];

  for (const relation of childrenRelations) {
      const child = relation.Member;
      
      // Recursively get the descendants of this child
      const childDescendants = await getDescendantsRecursive(child.id, familyId);

      // Get the spouse of the child
      const spouseRelation = await Relationship.findOne({
          where: {            
            relationshipType: 'spouse',
            [Op.or]: [
              { memberId: child.id },
              { relatedMemberId: child.id },
            ],
          },
          include: [
            {
              model: Member,
              as: 'RelatedMember',
              attributes: [
                'id', 'firstName', 'gender', 'middleName', 'nickName',
                'dateOfBirth', 'dateOfDeath', 'lastName', 'verified',
              ],
            },
            {
              model: Member,
              as: 'Member',
              attributes: [
                'id', 'firstName', 'gender', 'middleName', 'nickName',
                'dateOfBirth', 'dateOfDeath', 'lastName', 'verified',
              ],
            },
          ],
      });

      const spouse = spouseRelation ? spouseRelation.RelatedMember : null;

      descendants.push({
          id: child.id,
          firstName: child.firstName,
          middleName: child.middleName,
          lastName: child.lastName,
          nickName: child.nickName,
          gender: child.gender,
          dateOfBirth: child.dateOfBirth,
          dateOfDeath: child.dateOfDeath,
          memberImage: child.memberImage,
          children: childDescendants, // Recursive descendants
          spouse: spouse ? {
              id: spouse.id,
              firstName: spouse.firstName,
              middleName: spouse.middleName,
              lastName: spouse.lastName,
              nickName: spouse.nickName,
              gender: spouse.gender,
              memberImage: spouse.memberImage,
              dateOfBirth: spouse.dateOfBirth,
              dateOfDeath: spouse.dateOfDeath
          } : null
      });
  }

  return descendants;
};

// API to get the oldest member and their descendants
exports.familyTree = async (req, res) => {
  try {
      const { familyId } = req.params;

      // Get all members of the family
      const members = await Member.findAll({ where: { familyId } });
      console.log('members:', members);

      if (!members.length) {
          return res.status(404).json({ message: 'No members found in this family.' });
      }

      // Find the oldest member based on dateOfBirth
      const oldestMember = members.reduce((oldest, member) => {
          return !oldest || new Date(member.dateOfBirth) < new Date(oldest.dateOfBirth) ? member : oldest;
      }, null);
      console.log('oldestMember:', oldestMember);

      if (!oldestMember) {
          return res.status(404).json({ message: 'Could not determine the oldest member.' });
      }

      // Get all descendants of the oldest member
      const descendants = await getDescendantsRecursive(oldestMember.id, familyId);
      console.log('descendants:', descendants);

      return res.json({
          oldestMember: {
              id: oldestMember.id,
              firstName: oldestMember.firstName,
              middleName: oldestMember.middleName,
              lastName: oldestMember.lastName,
              gender: oldestMember.gender,
              dateOfBirth: oldestMember.dateOfBirth,
              dateOfDeath: oldestMember.dateOfDeath,
              memberImage: oldestMember.memberImage
          },
          descendants
      });

  } catch (error) {
      console.error('Error fetching descendants:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
};

const getMemberSpouse = async (memberId) => {
  try {
    // Find all spouse relationships for the given memberId
    const spouseRelationships = await Relationship.findAll({
      where: {
        relationshipType: 'spouse',
        [Op.or]: [
          { memberId: memberId },
          { relatedMemberId: memberId },
        ],
      },
      include: [
        {
          model: Member,
          as: 'RelatedMember',
          attributes: [
            'id', 'firstName', 'gender', 'middleName',
            'dateOfBirth', 'dateOfDeath', 'lastName', 'verified',
          ],
        },
        {
          model: Member,
          as: 'Member',
          attributes: [
            'id', 'firstName', 'gender', 'middleName',
            'dateOfBirth', 'dateOfDeath', 'lastName', 'verified',
          ],
        },
      ],
    });

    // Log the raw response for debugging
    console.log('Spouse Relationships Response:', spouseRelationships);

    // Format the relationships into a structured response
    const formattedSpouses = spouseRelationships.map((rel) => {
      // Determine whether the selected member is 'Member' or 'RelatedMember'
      const isPrimaryMember = rel.memberId === parseInt(memberId, 10);
      const spouse = isPrimaryMember ? rel.RelatedMember : rel.Member;

      return {
        id: spouse.id,
        firstName: spouse.firstName,
        middleName: spouse.middleName || null,
        lastName: spouse.lastName,
        gender: spouse.gender,
        dateOfBirth: spouse.dateOfBirth,
        dateOfDeath: spouse.dateOfDeath,
        verified: spouse.verified,
        relationshipId: rel.id,
        relationshipType: rel.relationshipType,
        qualifier: rel.rTQualifier,
      };
    });

    // Return formatted spouse relationships
    return formattedSpouses.length > 0 ? formattedSpouses : null;
  } catch (error) {
    console.error('Error fetching spouse data:', error);
    throw new Error('Failed to fetch spouse data');
  }
};


exports.spouses = async (req, res) => {
  const memberId = req.params;
  console.log('Received request for memberId:', memberId); // Log request ID

  try {
    const spouseData = await getMemberSpouse(memberId);
    if (spouseData) {
      res.json(spouseData);
    } else {
      res.status(404).json({ message: 'Spouse not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching spouse data' });
  }
};

// Function to build the family tree with spouses attached at the same level
const buildFamilyTreeWithSpouses = async (memberId, descendants, processed = new Set()) => {
  if (processed.has(memberId)) {
    return null; // Avoid processing the same member again
  }

  processed.add(memberId);

  const member = descendants.find((m) => m.id === memberId);
  if (!member) return null;

  // Process children recursively
  const children = [];
  for (let child of member.children || []) {
    const childWithSpouse = await buildFamilyTreeWithSpouses(child.id, descendants, processed);
    if (childWithSpouse) {
      // Find spouse for each child
      const spouseRelationship = await getMemberSpouse(child.id);
        
      if (spouseRelationship && spouseRelationship.RelatedMember) {
        childWithSpouse.spouse = {
          id: spouseRelationship.RelatedMember.id,
          firstName: spouseRelationship.RelatedMember.firstName,
          lastName: spouseRelationship.RelatedMember.lastName,
        };
      }
      children.push(childWithSpouse);
    }
  }

  return {
    id: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    gender: member.gender,
    dateOfBirth: member.dateOfBirth,
    dateOfDeath: member.dateOfDeath,
    memberImage: member.memberImage,
    children,
  };
};

// Route to retrieve all descendants of a member and their count
exports.oldestMemberDescendants = async (req, res) => {
  const { memberId } = req.params;

  try {
    const { descendants, count } = await getDescendants(memberId);
    const familyTree = await buildFamilyTreeWithSpouses(memberId, descendants);

    return res.status(200).json({ count, descendants: familyTree ? [familyTree] : [] });
  } catch (error) {
    console.error('Error retrieving descendants:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};
