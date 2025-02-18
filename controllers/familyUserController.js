const { models } = require('../models');  // Import models from index.js
const { FamilyUser, Member, User, Family } = models;  // Destructure to get the User model
//const { Member, Family } = require('../models');
const { sendInvitationEmail } = require('../utils/invitationEmail');
const moment = require('moment');
const uploadToCloudinary = require('../utils/cloudinary');
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
  
  exports.isMemberAUser = async (req, res) => {
    try {
      const { memberId } = req.params;
  
      /*/ Validate input
      if (!memberId) {
        return res.status(400).json({ success: false, message: 'Member ID is required.' });
      }*/
  
      // Check if the member exists in the UserMember table
      const isUser = await UserMember.findOne({
        where: { memberId },
      });
      console.log('user Id Found:', isUser)
      if (isUser) {
        return res.status(200).json({ success: true, isUser: true, message: 'Member is already a registered user.' });
      } 
      if (isUser === null) {
        return res.status(200).json({ success: false, isUser: false, message: 'Member is not a registered user.' });
      }
    } catch (error) {
      console.error('Error in checkIfMemberIsUser:', error);
      return res.status(500).json({ success: false, message: 'An error occurred while checking member status.' });
    }
  };

  exports.getUserFamilies = async (req, res) => {
    const { userId } = req.params;
  
    try {
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required.' });
      }
  
      // Fetch user families linked to the given userId
      const userFamilies = await FamilyUser.findAll({
        where: { userId },
        include: [
          {
            model: Family,
            as: 'Family', // Match this alias to your relationship definition
            attributes: ['id', 'familyName', 'description'],
          },
        ],
      });
  
      if (!userFamilies.length) {
        return res.status(404).json({ message: 'No families found for this user.' });
      }
  
      return res.status(200).json(userFamilies);
    } catch (error) {
      console.error('Error fetching user families:', error);
      return res.status(500).json({ message: 'Failed to fetch user families.' });
    }
  };
  

  /*exports.joinFamily = async (req, res) => {
    const { familyId } = req.params;
    const userId = req.user.id;
  
    try {
      if (!userId || !familyId) {
        return res.status(400).json({ message: 'User ID and Family ID are required.' });
      }

      await FamilyUser.create({userId, familyId});
  
      return res.status(200).json({ message: 'request to join family successful' });
    } catch (error) {
      console.error('Error joining family:', error);
      return res.status(500).json({ message: 'Failed to join family.' });
    }
  };*/

  exports.getFamilyUsers = async (req, res) => {
    const { familyId } = req.params;
  
    try {
      const familyUsers = await FamilyUser.findAll({
        where: { familyId },
        include: [
          {
            model: User,
            attributes: ['id', 'userName', 'email', 'phoneNumber'], // Include all necessary fields
          },
        ],
      });
  
      console.log('Fetched Family Users:', JSON.stringify(familyUsers, null, 2));
  
      if (familyUsers.length === 0) {
        return res.status(404).json({ message: 'No users found for this family.' });
      }
  
      // Map to match frontend expectations
      const formattedUsers = familyUsers.map((familyUser) => ({
        id: familyUser.User.id,
        name: familyUser.User.userName, // Rename to `name` as expected by the frontend
        email: familyUser.User.email,
        phoneNumber: familyUser.User.phoneNumber,
        isEnabled: familyUser.isEnabled,
        isAdmin: familyUser.isAdmin,
      }));
  
      return res.status(200).json(formattedUsers);
    } catch (error) {
      console.error('Error fetching family members:', error);
      return res.status(500).json({ message: 'Failed to fetch family members.' });
    }
  };
  
  exports.updateUserRoleOrStatus = async (req, res) => {
    try {
      const { userId, familyId } = req.params;
      const { isEnabled, isAdmin, isActive } = req.body;
      const adminUser = req.user.id;
  
      const user = await FamilyUser.findOne({where: { userId: userId, familyId: familyId}});
      if (user.userId === adminUser) {
        return res.status(403).json({ message: "Admins cannot remove themselves." });
      }
  
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }
  
      // Update user fields
      user.isEnabled = isEnabled ?? user.isEnabled; // Update only if provided
      user.isAdmin = isAdmin ?? user.isAdmin;
      user.isActive = isActive ?? user.isActive;
  
      await user.save();
  
      res.status(200).json({ message: 'User updated successfully.', user });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Server error while updating user.' });
    }
  };
  
  exports.getUserStatus = async (req, res) => {
    const { familyId } = req.params; // Destructure familyId from req.params
    const userId = req.user.id; // Assume req.user.id is available via middleware authentication
  
    try {
      const user = await FamilyUser.findOne({
        where: { 
          familyId: familyId, 
          userId: userId 
        },
        attributes: ['isEnabled', 'isAdmin'], // Ensure you only fetch the 'isEnabled' attribute
      });
  
      if (!user) {
        return res.status(404).json({ message: 'User not found in this family.' });
      }
  
      console.log('User Status:', user);
      res.json({ isEnabled: user.isEnabled, isAdmin: user.isAdmin, message: !user }); // Send the user status as a response
    } catch (error) {
      console.error('Error fetching user status:', error);
      res.status(500).json({ message: 'Server error while fetching user status.' });
    }
  };
  
  // report a family
const sendRequestToJoin = (reason, userName, userEmail, adminEmails, familyName, familyId) => {
  const mailOptions = {
    from: `${userEmail}`, // sender address
    to: `${adminEmails}`, // Admins' email(s)
    subject: 'Request to Join Family', // Subject
    text: `${userEmail} whose email is ${userName}, is requesting to join ${familyName}.\n\nDetails: \n${reason}. \n\n Please accept them in the FamApp. \n\n\n You have received this message because you are an admin of ${familyName} family.`, // Message
  };
  
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
  };
  
  exports.joinFamily = async (req, res) => {
    try {
      const { familyId } = req.params; // Extract familyId from req.params
      const { reason } = req.body;

      //fetch user
      const user = await User.findOne({where: {id: req.user.id}});
      const userEmail = user.email;
      const userName = user.userName;


      console.log('User Email:', userEmail);
      console.log('User Name:', userName);
  
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

      await FamilyUser.create({userId: req.user.id, familyId});
  
      // Send the report email
      await sendRequestToJoin(reason, userEmail, userName, adminEmails, familyName, familyId);
  
      // Send a success response
      res.status(200).json({ message: 'Report has been sent to the admins.' });
    } catch (error) {
      console.error('Error reporting family:', error);
      res.status(500).json({ message: 'Server error while reporting family.' });
    }
  };