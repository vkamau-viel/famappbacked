const { models } = require('../models');  // Import models from index.js
const { Family, Member, Relationship, FamilyUser, User } = models;  // Destructure to get the User model
const { Op } = require('sequelize'); // Import Sequelize operators
const nodemailer = require('nodemailer');

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // You can use any email service like Gmail, SendGrid, etc.
  auth: {
    user: process.env.EMAIL_USER,  // Your email address
    pass: process.env.EMAIL_PASSWORD,  // Your email password or App-specific password
  },
});

// Fetch all family names
exports.getFamilyNames = async (req, res) => {
    try {
        const families = await Family.findAll();
        const familyNames = families.map(family => family.familyName);
        res.json({ names: familyNames });
      } catch (error) {
        console.error('Error fetching family names:', error);
        res.status(500).json({ message: 'Failed to load family names' });
      }
    };

// Create a new family
exports.createFamily = async (req, res) => {
    console.log('data from fronted:', req.body)
    const { familyName, description, origin, country, county, location, tribe, verifications } = req.body;
    const userId = req.user.id; // Assuming the user ID is attached to the request (e.g., via authentication middleware)

    console.log('user ID:', userId)

    if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
    }
  
    try {
      // Check if the family name already exists
      const existingFamily = await Family.findOne({ where: { familyName } });
      if (existingFamily) {
        return res.status(400).json({ message: 'Family name must be unique' });
      }
  
      // Create the new family
      const newFamily = await Family.create({
        familyName,
        description,
        origin,
        country,
        county,
        location,
        tribe,
        verifications,
        createdBy: userId,
      });

      // Insert the creator as the first member of the new family in the familyUsers table
    await FamilyUser.create({
      familyId: newFamily.id,
      userId: userId,
      isAdmin: 1, // Creator is an admin
      isEnabled: 1, // Creator is enabled
    });
  
      return res.status(201).json({ message: 'Family created successfully', family: newFamily });
    } catch (error) {
      console.error('Error creating family:', error);
      return res.status(500).json({ message: 'Failed to create family' });
    }
  };

  // API Endpoint to search families
exports.searchFamilies = async (req, res) => {
  
    try {
        const { query } = req.query;
    
        if (!query || query.length < 3) {
          return res.status(400).json({ error: 'Search query must be at least 3 characters long.' });
        }
      // Perform a case-insensitive search across multiple fields (familyName, description, etc.)
      const families = await Family.findAll({
        where: {
          [Op.or]: [
            { familyName: { [Op.like]: `%${query}%` } },
            { description: { [Op.like]: `%${query}%` } },
            { origin: { [Op.like]: `%${query}%` } },
            { country: { [Op.like]: `%${query}%` } },
            { county: { [Op.like]: `%${query}%` } },
            { location: { [Op.like]: `%${query}%` } },
            { tribe: { [Op.like]: `%${query}%` } }
          ]
        }
      });
  
      // Return the search results
      console.log('families:', families)
      res.json(families);
    } catch (error) {
      console.error('Error searching families:', error);
      res.status(500).json({ message: 'Server Error' });
    }
  };

  exports.deleteFamily = async (req, res) => {
    const { familyId } = req.params;
  
    try {
      const members = await Member.findAll({ where: { familyId } });
      if (members.length > 0) {
        return res.status(400).json({ error: 'Cannot delete family with existing members.' });
      }
  
      await Family.destroy({ where: { id: familyId } });
      res.status(200).json({ message: 'Family deleted successfully.' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete family.' });
    }
  };

  // Get family by ID
exports.getFamilyById = async (req, res) => {
    const { familyId } = req.params;
    try {
      const family = await Family.findByPk(familyId, {
        include: [
          {
            model: Member,
            as: 'members',
          },
          {
            model: Relationship,
            as: 'relationships',
          }
        ],
      });
      console.log('Families found:', family)
      
      if (!family) {
        return res.status(404).json({ message: 'Family not found' });
      }
      
      return res.status(200).json(family);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Server error' });
    }
  };
  
  exports.getMembersByFamilyId = async (req, res) => {
    const { familyId } = req.params;
    console.log('family ID:', familyId);
    if (!familyId) {
      return res.status(400).json({ message: 'Family ID is required' });
    }
    try {
      const members = await Member.findAll({ where: { familyId } });
      if (members.length === 0) {
        return res.status(404).json({ message: 'No members found for this family' });
      }
      return res.status(200).json(members);
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ message: 'Server error' });
    }
  };
  
  // Get all relationships of a family
exports.getRelationshipsByFamilyId = async (req, res) => {
  const { familyId } = req.params;
  try {
    const relationships = await Relationship.findAll({
      where: {
        [Op.or]: [{ familyId: familyId }, { relatedMemberId: familyId }],
      },
      include: [
        {
          model: Member, // Assuming the Member model is already defined and associated
          as: 'Member', // Alias for the member in the relationship
          attributes: ['firstName', 'lastName', 'middleName', 'dateOfBirth', 'dateOfDeath'], // Specify the fields to retrieve for the member
        },
        {
          model: Member, // Assuming the RelatedMember model is the same as Member
          as: 'RelatedMember', // Alias for the related member in the relationship
          attributes: ['firstName', 'lastName', 'middleName', 'dateOfBirth', 'dateOfDeath'], // Specify the fields to retrieve for the related member
        },
      ],
    });
    return res.status(200).json(relationships);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

  
  // Add a new member to a family
  exports.addMember = async (req, res) => {
    const { familyId } = req.params;
    const { firstName, lastName, age, gender, image } = req.body;
    try {
      const member = await Member.create({ familyId, firstName, lastName, age, gender, image });
      return res.status(201).json(member);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Server error' });
    }
  };
  
  // Add a new relationship
  exports.addRelationship = async (req, res) => {
    const { familyId } = req.params;
    const { memberId, relatedMemberId, type } = req.body;
    try {
      const relationship = await Relationship.create({ memberId, relatedMemberId, type });
      return res.status(201).json(relationship);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Server error' });
    }
  };
  
  // Delete a family member
  exports.deleteMember = async (req, res) => {
    const { familyId, memberId } = req.params;
    try {
      const member = await Member.findOne({ where: { id: memberId, familyId } });
      if (!member) {
        return res.status(404).json({ message: 'Member not found' });
      }
      await member.destroy();
      return res.status(200).json({ message: 'Member deleted successfully' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Server error' });
    }
  };
  
  // Delete a relationship
  exports.deleteRelationship = async (req, res) => {
    const { relationshipId } = req.params;
    try {
      const relationship = await Relationship.findByPk(relationshipId);
      if (!relationship) {
        return res.status(404).json({ message: 'Relationship not found' });
      }
      await relationship.destroy();
      return res.status(200).json({ message: 'Relationship deleted successfully' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Server error' });
    }
  };
  
  /**
 * Update family details
 */
exports.updateFamily = async (req, res) => {
  //const { familyId } = req.params;
  const { familyId, updatedFamily } = req.body;
  const userId = req.user.id;
  //console.log('family Name:', familyName, 'Description', description)

  try {
    const family = await Family.findByPk(familyId);

    if (!family) {
      return res.status(404).json({ message: 'Family not found.' });
    }

    /*const updatedFamily = {
      familyName, description, origin, country, county, location,tribe, verifications, updatedBy: userId
    }*/
    await Family.update(updatedFamily, { where: { id: familyId }});

    /*/ Update the family details
    family.familyName = familyName || family.familyName;
    family.description = description || family.description;
    family.origin = origin || family.origin;
    family.country = country || family.country;
    family.county = county || family.county;
    family.location = location || family.location;
    family.tribe = tribe || family.tribe;
    family.verifications = verifications || family.verifications;

    await family.save();*/

    res.status(200).json({ message: 'Family updated successfully.', family });
  } catch (error) {
    console.error('Error updating family:', error);
    res.status(500).json({ message: 'An error occurred while updating family details.' });
  }
};

// report a family
const sendReportEmail = (reason, userEmail, adminEmails, familyName, familyId) => {
const mailOptions = {
  from: `${userEmail}`, // sender address
  to: `${adminEmails}`, // Admins' email(s)
  subject: 'Reported Family', // Subject
  text: `A family has been reported. Details:\n\nName: ${familyName}\nFamily ID: ${familyId}\nReason: ${reason}`, // Message
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.log('Error sending email:', error);
  } else {
    console.log('Email sent:', info.response);
  }
});
};

exports.reportFamily = async (req, res) => {
  try {
    const userEmail = req.user.email;
    const { familyId } = req.params; // Extract familyId from req.params
    const { reason } = req.body;

    // Fetch all admin emails
    const admins = await FamilyUser.findAll({
      where: { isAdmin: true, familyId: familyId },
      include: [ { model: User, attributes: [ 'email' ]}]
    });
    console.log('admins:', admins)

    const adminEmails = admins.map(admin => admin.User.email); // Extract email array
    console.log('Admins Emails:', adminEmails);

    // Fetch family name
    const family = await Family.findByPk(familyId, {
      attributes: ['familyName'], // Correctly specify attributes
    });

    if (!family) {
      return res.status(404).json({ message: 'Family not found.' });
    }

    const familyName = family.familyName; // Extract family name
    console.log('Family Name:', familyName);

    // Send the report email
    await sendReportEmail(reason, userEmail, adminEmails, familyName, familyId);

    // Send a success response
    res.status(200).json({ message: 'Report has been sent to the admins.' });
  } catch (error) {
    console.error('Error reporting family:', error);
    res.status(500).json({ message: 'Server error while reporting family.' });
  }
};

exports.getFamilyByFamilyId = async (req, res) => {
  const { familyId } = req.params;
  try {
    const family = await Family.findByPk(familyId);
    console.log('family Data:', family)
    if (!family) {
      return res.status(404).json({ message: 'family does not exist'});
    }    
    res.json(family);
  } catch (error) {
    console.error('Error reporting family:', error);
    res.status(500).json({ message: 'Server error while retrieving family.' });
  }
}

exports.familyTreeData = async (req, res) => {
  try {
    const { familyId } = req.params;

    const relationships = await Relationship.findAll({ where: { familyId },
      include: [ 
        {model: Member, as: 'Member', attributes: [ 'firstName', 'dateOfDeath', 'id', 'middleName', 'lastName', 'dateOfBirth', 'memberImage', 'gender' ]},
        {model: Member, as: 'RelatedMember', attributes: [ 'firstName', 'dateOfDeath', 'id','middleName','lastName', 'dateOfBirth', 'memberImage', 'gender' ]},
      ],
    });

    // Ensure to return proper JSON objects
    const relationshipsWithMemberDetails = relationships.map(rel => ({
      ...rel.toJSON(),  // Serialize Sequelize object to plain JSON
      Member: rel.Member.toJSON(),
      RelatedMember: rel.RelatedMember.toJSON(),
    }));
    console.log('Fetched Relationships:', JSON.stringify(relationships, null, 2));
    console.log('fetche relationships afater map.', relationshipsWithMemberDetails)

    res.json({ relationshipsWithMemberDetails});
  } catch (error) {
    console.error('Error fetching family tree:', error);
    res.status(500).json({ error: 'Failed to fetch family tree' });
  }
};

exports.familyStats = async (req, res) => {
  const { familyId } = req.params;
  try {
    const familyMembers = await Member.count({where: {familyId: familyId}});
    const latestFamilyMembers = await Member.findAll({ where: { familyId }, order: [['createdAt', 'DESC']], limit: 5 });
    const familyRelationships = await Relationship.count({where: {familyId: familyId}});
    const latestFamilyRelationships = await Relationship.findAll({ where: { familyId }, order: [['createdAt', 'DESC']], limit: 5 });  
    const familyUsers = await FamilyUser.count({where: {familyId: familyId}});

    console.log('latestFamilyMembers:', latestFamilyMembers, 'latestFamilyRelationships:', latestFamilyRelationships, 'familyUsers:', familyUsers); 

    res.json({ familyMembers, familyRelationships, familyUsers, latestFamilyMembers, latestFamilyRelationships });
  } catch (error) {
    console.error('Error fetching family stats:', error);
    res.status(500).json({ error: 'Failed to fetch family stats' });
  }

}