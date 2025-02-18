require('dotenv').config();  // Load environment variables if using .env files
const cron = require('node-cron');
const nodemailer = require('nodemailer'); // For sending email (make sure to configure SMTP settings)
const { Member, MemberApprovals } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');

const sendUnverifiedMembersListToAdmin = async () => {
  try {
    // Get all unverified members (assuming there's a `verified` field in the `Members` table)
    const unverifiedMembers = await Member.findAll({
      where: { verified: null },  // Assuming `verified` is a field that tracks verification status
    });

    if (unverifiedMembers.length === 0) {
      console.log('No unverified members found.');
      return;
    }

    // List of unverified members
    const memberList = unverifiedMembers.map((member) => ({
      name: `${member.firstName} ${member.middleName} ${member.lastName}`,
      email: member.email,
      memberId: member.id,
    }));

    // Fetch admin users
    const admins = await Member.findAll({ where: { role: 'admin' } });
    const adminList = admins.map((admin) => admin.email).join(', ');  // Join admin emails with comma

    if (!adminList) {
      console.log('No admin users found.');
      return;
    }

    // Send email to admin
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,  // Ensure this is your email address (e.g., Gmail)
        pass: process.env.EMAIL_PASSWORD,  // Ensure this is your email password or app-specific password
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,  // Use your email here
      to: adminList,  // List of admin email addresses
      subject: 'List of Unverified Members',
      text: `Please verify the following members:\n\n${memberList
        .map((m) => `Name: ${m.name}, Email: ${m.email}`)
        .join('\n')}`,  // Join member details with new lines
    };

    await transporter.sendMail(mailOptions);
    console.log('Unverified members list sent to admin.');
  } catch (error) {
    console.error('Error sending unverified members list:', error);
  }
};


const deleteMembersWithoutApprovals = async () => {
  try {
    const membersToDelete = await Member.findAll({
      where: {
        verified: 0,
        createdAt: {
          [Op.lte]: moment().subtract(52, 'days').toDate(),
        },
      },
    });

      if (membersToDelete) {
        await Member.destroy();
        console.log(`Deleted member: ${membersToDelete.firstName} ${membersToDelete.lastName}`);
      }
  } catch (error) {
    console.error('Error checking and deleting members:', error);
  }
};



// Schedule the task to run every 2 minutes (change to 2 minutes for testing)
cron.schedule('*/2 * * * *', sendUnverifiedMembersListToAdmin);
cron.schedule('0 0 * * *', deleteMembersWithoutApprovals); // Run every day at midnight
