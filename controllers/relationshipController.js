const { models } = require('../models'); 
const { Relationship, VerifiedRelationship, Family, Member } = models; // Sequelize models
const { Op } = require('sequelize'); // Import Sequelize operators

// Get all relationships for a specific member
exports.getRelationships = async (req, res) => {
  const { selectedMemberId } = req.params;
  console.log('Selected Member ID:', selectedMemberId);

  try {
    // Fetch relationships with the specified conditions
    const relationships = await Relationship.findAll({
      where: {
        [Op.or]: [
          { memberId: selectedMemberId },
          {
            [Op.and]: [
              { relationshipType: 'spouse' },
              {
                [Op.or]: [
                  { memberId: selectedMemberId },
                  { relatedMemberId: selectedMemberId },
                ],
              },
            ],
          },
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

    // Log the raw relationships for debugging
    console.log('Response:', relationships);

    // Format the relationships into a structured response
    const formattedRelationships = relationships.map((rel) => {
      const isSelectedMember = rel.memberId === parseInt(selectedMemberId, 10);
      const relatedMember = isSelectedMember ? rel.RelatedMember : rel.Member;

      return {
        id: rel.id,
        type: rel.relationshipType,
        qualifier: rel.rTQualifier,
        verified: rel.verified,
        memberId: relatedMember.id,
        memberName: `${relatedMember.firstName} ${relatedMember.middleName || ''} ${relatedMember.lastName}`.trim(),
        memberGender: relatedMember.gender,
        memberDateOfBirth: relatedMember.dateOfBirth,
        memberDateOfDeath: relatedMember.dateOfDeath,
        memberVerified: relatedMember.verified,
      };
    });

    // Send the formatted response
    res.json(formattedRelationships);
  } catch (error) {
    console.error('Error fetching relationships:', error);
    res.status(500).json({ message: 'Failed to fetch relationships' });
  }
};



// Add a new relationship
exports.addRelationship = async (req, res) => {
  const { memberId, relatedMemberId, relationshipType, rTQualifier } = req.body;
  const familyId = req.params.familyId;

  try {
    const existingSpouse = await Relationship.findOne({where: { 
      relationshipType: 'spouse',
      memberId: memberId,
      relatedMemberId: relatedMemberId,
      [Op.or]: [
        {relationshipType: 'spouse'},
        { memberId: relatedMemberId },
        { relatedMemberId: memberId }
      ]
    }});

    if (existingSpouse && relationshipType === 'spouse') {        
      return res.status(400).json({ message: 'Relationship already exists' });
    } 

    // Attempt to create the relationship
    const relationship = await Relationship.create({
      memberId,
      relatedMemberId,
      relationshipType,
      rTQualifier,
      familyId,
    });

    res.status(201).json(relationship);
  } catch (error) {
    console.error(error);

    // Handle Sequelize unique constraint error
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        message: 'This relationship already Exists',
        details: `A relationship between memberId ${memberId} and relatedMemberId ${relatedMemberId} already exists.`,
      });
    }

    // Handle other potential errors
    res.status(500).json({ message: 'Failed to add relationship' });
  }
};


// Remove a relationship
exports.deleteRelationship = async (req, res) => {
  const { relationshipId } = req.params;

  try {
    const relationship = await Relationship.findByPk(relationshipId);

    if (!relationship) {
      return res.status(404).json({ message: 'Relationship not found' });
    }

    await relationship.destroy();
    res.status(200).json({ message: 'Relationship removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to remove relationship' });
  }
};

// Verify relationship
exports.verifyRelationship = async (req, res) => {
  const { relationshipId, familyId } = req.params;
  const userId = req.user.id
  console.log('user ID:', userId, 'selected Relationship ID:', relationshipId, 'family ID:', familyId)

  try {
    // Check if the record already exists
    const existingVerification = await VerifiedRelationship.findOne({
      where: {
        verifiedBy: userId,
        verifiedRelationshipId: relationshipId,
      },
    });
  
    if (existingVerification) {
      return res.status(400).json({ message: 'Relationship is already verified by this user.' });
    }
    await VerifiedRelationship.create({ verifiedBy: userId, verifiedRelationshipId: relationshipId });
    res.status(200).json({ message: 'Relationship verified successfully' });
    
    const verifiedRelationship = await VerifiedRelationship.count({where: {verifiedRelationshipId:relationshipId}});
    const verifications = await Family.findByPk(familyId);
    const verificationsRequired = verifications.verifications;
    if(verifiedRelationship >= verificationsRequired) {
      await Relationship.update({verified: 1}, {where:{id:relationshipId}});
    }
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ message: 'You have already verified this relationship' });
    } else {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};