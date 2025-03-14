const { models } = require('../models');  // Import models from index.js
const { Family, FamilyUser, Member, VerifiedMember, Relationship, VerifiedRelationship } = models;  // Destructure to get the User model
//const { Member, Family } = require('../models');
const { sendInvitationEmail } = require('../utils/invitationEmail');
const moment = require('moment');
const uploadToCloudinary = require('../utils/cloudinary');
//const { Op } = require('sequelize'); // Import Sequelize operators
const { Sequelize, Op } = require('sequelize');

// Add a new family member
exports.addMember = async (req, res) => {
  const userId = req.user.id;
  const familyId = req.params.familyId;
  console.log('Family ID:', familyId)
  
  try {
    const user = await FamilyUser.findOne({where: {familyId: familyId, userId: userId}});
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!user.isEnabled) {
      return res.status(403).json({ message: 'You are not enabled to add members. Request an admin to enable you.' });
    }

    const {
      firstName,
      middleName,
      lastName,
      nickName,
      dateOfBirth,
      dobQualifier,
      dateOfDeath,
      dodQualifier,
      description,
      email,
      phoneNumber,
      gender,
    } = req.body;

    // Extract birth year from the provided dateOfBirth
    const birthYear = new Date(dateOfBirth).getFullYear();

    // Check if a member with the same firstName, lastName, and birth year exists
    const existingMember = await Member.findOne({
      where: {
        firstName,
        lastName,
        familyId,
        dateOfBirth: {
          [Sequelize.Op.between]: [
            new Date(`${birthYear}-01-01`),
            new Date(`${birthYear}-12-31`),
          ],
        },
      },
    });

    if (existingMember) {
      return res.status(403).json({ message: 'A member with the same first name, last name, and birth year already exists.' });
    }

    // Upload image to Cloudinary if present
    let memberImage = null;
    console.log('image from frontend:', req.file)
    if (req.file) {
      const image = await uploadToCloudinary(req.file.path);
      console.log('Image URL:', image.secure_url)
      memberImage = image.secure_url;
    }

    // Save member to the database
    const member = await Member.create({
      familyId,
      firstName,
      middleName,
      lastName,
      nickName,
      dateOfBirth,
      dobQualifier,
      dateOfDeath: !dodQualifier === '' ? dateOfDeath : null,
      dodQualifier,
      description,
      email,
      phoneNumber,
      gender,
      createdBy: userId,
      memberImage: !req.file === '' ? null : memberImage, // Save Cloudinary URL
    });

    res.status(201).json({
      success: true,
      message: 'Member added successfully!',
      data: member,
    });
  } catch (error) {
    console.error('Error adding member:', error);
     // Check for Sequelize unique constraint error
     if (error.name === 'SequelizeUniqueConstraintError') {
      const duplicateFields = error.errors.map((err) => err.path).join(', ');
      return res.status(400).json({
        success: false,
        message: `Member with the same ${duplicateFields} already exists.`,
      });
    }
    res.status(500).json({ success: false, message: 'Failed to add member' });
  }
};

// Get details of a specific member
exports.getMemberDetails = async (req, res) => {
  const { memberId } = req.params;
  console.log('member ID:', memberId)
  try {
    const member = await Member.findByPk(memberId); // Find member by primary key
    console.log('member details:', member)
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }
    res.json(member);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get relationships of a specific member
exports.getRelationships = async (req, res) => {
  const { memberId } = req.params;
  try {
    const relationships = await Relationship.findAll({
      where: {
        memberId,
      },
    });
    res.json(relationships);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get descendants of a specific member
exports.getDescendants = async (req, res) => {
  const { memberId } = req.params;
  try {
    const descendants = await Relationship.findAll({
      where: {
        relatedTo: memberId,
      },
    });
    res.json(descendants);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get ancestors of a specific member
exports.getAncestors = async (req, res) => {
  const { memberId } = req.params;
  try {
    const ancestors = await Relationship.findAll({
      where: {
        memberId: memberId,
      },
    });
    res.json(ancestors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get family tree for a specific member (you might want to define what data this includes)
exports.getFamilyTree = async (req, res) => {
  const { memberId } = req.params;
  try {
    // Fetch family tree logic here
    // For example, fetching all family relationships in a hierarchical structure
    const familyTree = await Relationship.findAll({
      where: { memberId },
      include: [Member],
    });
    res.json(familyTree);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const cloudinary = require('cloudinary').v2;

// Update member details
exports.updateMember = async (req, res) => {
  const { memberId } = req.params; // Member ID from request parameters
  const userId = req.user.id; // Logged-in user ID (from middleware)

  const {
    firstName,
    middleName,
    lastName,
    nickName,
    dateOfBirth,
    dobQualifier,
    dateOfDeath,
    dodQualifier,
    description,
    email,
    phoneNumber,
    gender,
  } = req.body;
console.log('Date of Death:', dateOfDeath)
  try {
    // Find the member by ID
    const member = await Member.findByPk(memberId);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Handle image upload (if a new file is uploaded)
    let imageUrl = member.memberImage; // Retain the existing image if no new one is uploaded
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'members',
          resource_type: 'image',
        });
        imageUrl = result.secure_url; // Update image URL with Cloudinary's secure URL
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(500).json({ message: 'Image upload failed', error: uploadError.message });
      }
    }

    // Updated member data
    const updatedData = {
      firstName,
      middleName,
      lastName,
      nickName,
      dateOfBirth,
      dobQualifier,
      dateOfDeath: dateOfDeath || null,
      dodQualifier,
      description,
      email,
      phoneNumber,
      gender,
      updatedBy: userId, // Track who updated this member
      memberImage: imageUrl, // Save the Cloudinary URL
    };

    // Update the member in the database
    await member.update(updatedData);

    // Respond with success
    res.status(200).json({ message: 'Member updated successfully', member });
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};


// Remove member
exports.deleteMember = async (req, res) => {
  const { memberId } = req.params;
  try {
    // Find the member by primary key
    const member = await Member.findByPk(memberId);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Delete the member from VerifiedMember
    await VerifiedMember.destroy({ where: { verifiedId: memberId } });

    // Find all relationships where the member is either memberId or relatedMemberId
    const matchingRelationship = await Relationship.findAll({
      where: {
        [Op.or]: [
          { memberId: memberId },
          { relatedMemberId: memberId }
        ]
      }
    });

    // Extract the ids from the relationships
    const verifiedRelationships = matchingRelationship.map(rel => ({
      id: rel.id
    }));

    // Log all the ids (optional)
    verifiedRelationships.forEach(rel => console.log('Verified Relationship ID:', rel.id));

    // Delete each VerifiedRelationship by its id
    for (const rel of verifiedRelationships) {
      await VerifiedRelationship.destroy({ where: { verifiedRelationshipId: rel.id } });
    }

    // Now delete the relationships themselves
    await Relationship.destroy({
      where: {
        [Op.or]: [
          { memberId: memberId },
          { relatedMemberId: memberId }
        ]
      }
    });

    // Finally, delete the member
    await member.destroy();

    // Send response
    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};


// Verify member
exports.verifyMember = async (req, res) => {
  const { selectedMemberId, familyId } = req.body;
  const userId = req.user.id
  console.log('user ID:', userId, 'selected Member ID:', selectedMemberId)

  try {
    await VerifiedMember.create({ verifiedBy: userId, verifiedId: selectedMemberId });
    res.status(200).json({ message: 'Member verified successfully' });
    
    const verifiedMember = await VerifiedMember.count({where: {verifiedId:selectedMemberId}});
    const verifications = await Family.findByPk(familyId);
    const verificationsRequired = verifications.verifications;
    if(verifiedMember >= verificationsRequired) {
      await Member.update({verified: 1}, {where:{id:selectedMemberId}});
    }
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ message: 'You have already verified this member' });
    } else {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

// Get member verifications
exports.getMemberVerifications = async (req, res) => {
  const { verifiedMemberId, familyId } = req.params;  
  console.log('Query Parameters:', req.params);

  try {
    const verifications = await VerifiedMember.count({
      where: { verifiedId: verifiedMemberId },
    });

    const family = await Family.findOne({
      where: { id: familyId },
      attributes: ['verifications'],
    });

    if (!family) {
      return res.status(404).json({ message: 'Family not found.' });
    }

    const familyVerifications = family.verifications || 0;
    console.log('Verification Count:', verifications, 'Family Verifications:', familyVerifications);

    res.status(200).json({ verifications, verificationRequired: familyVerifications });
  } catch (error) {
    console.error('Error in getMemberVerifications:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Send email to admins
const nodemailer = require('nodemailer');

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // You can use any email service like Gmail, SendGrid, etc.
  auth: {
    user: process.env.EMAIL_USER,  // Your email address
    pass: process.env.EMAIL_PASSWORD,  // Your email password or App-specific password
  },
});

const sendReportEmail = (reason, userEmail, admins, memberName, memberId) => {
  const mailOptions = {
    from: `${userEmail}`, // sender address
    to: 'vkamau@gmail.com', // Admins' email(s)
    subject: 'Reported Member - Not a Genuine Member', // Subject
    text: `A member has been reported. Details:\n\nName: ${memberName}\nMember ID: ${memberId}\nReason: ${reason}`, // Message
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
};

exports.reportMember = async (req, res) => {
  const { reportedMemberId, reason } = req.body;
  const userEmail = req.user.email;
  const familyId = req.params;

  try {
    const member = await Member.findByPk(reportedMemberId); // Fetch member from DB
    const admins = await Member.findAll({ where: {role: 'admin', familyId: familyId}})
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Send report email to admins
    sendReportEmail(reason, userEmail, admins, `${member.firstName} ${member.lastName}`, member.id);

    res.status(200).json({ message: 'Report has been sent to the admins.' });
  } catch (error) {
    console.error('Error reporting member:', error);
    res.status(500).json({ message: 'Server error while reporting member' });
  }
};

// Function to send invite email
exports.sendInviteEmail = async (req, res) => {
  const { familyId, email } = req.body;
  console.log('family ID:', familyId, 'Email:', email)

  if (!familyId || !email) {
    return res.status(400).json({ success: false, message: 'Family ID and email are required.' });
  }

  try {
    // Check if the family exists
    const family = await Family.findByPk(familyId);
    if (!family) {
      return res.status(404).json({ success: false, message: 'Family not found.' });
    }

    // Create a transporter for sending the email
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Replace with your email service
      auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASSWORD, // Your email password
      },
    });

    // Compose the invitation email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'You are invited to join a family on FamApp',
      text: `You have been invited to join the family "${family.familyName}" on FamApp. "{\n}"
      1. Search for FamApp on Google Play Store and install{"\n}"
      2. Register and login{"\n}"
      3. Search for "${family.familyName}" and request to join."{\n}""{\n}"
      
      Welcome to FamApp: Because blood is thicker than watermily:`,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    return res.status(200).json({ success: true, message: 'Invitation sent successfully.' });
  } catch (error) {
    console.error('Error sending invite email:', error);
    return res.status(500).json({ success: false, message: 'Failed to send invite email.' });
  }
};

