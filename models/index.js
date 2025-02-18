const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');
//const FamilyUser = require('./FamilyUser');
//const VerifyMember = require('./VerifiedMember');

require('dotenv').config();

// Initialize Sequelize
const sequelize = new Sequelize({
  dialect: 'mysql', // or 'postgres', 'sqlite', etc.
  host: process.env.DB_HOST,
  username: process.env.DB_USER,  // Your database username
  password: process.env.DB_PASSWORD,      // Your database password
  database: process.env.DB_NAME, // Your database name
});

// Dynamically import models
const models = {};

// Read all files in the current directory (models folder)
fs.readdirSync(__dirname)
  .filter(file => file !== 'index.js')  // Exclude index.js from the list
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, DataTypes);
    models[model.name] = model;
  });

// Destructure models for associations,
const { Family, Member, User, Relationship, VerifiedMember, VerifiedRelationship, FamilyUser } = models;

// Define associations
if (Family && Member) {
  Family.hasMany(Member, { foreignKey: 'familyId', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
  Member.belongsTo(Family, { foreignKey: 'familyId', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
}

if (User && Family) {
  User.hasMany(Family, { foreignKey: 'createdBy' });
  Family.belongsTo(User, { foreignKey: 'createdBy' });
}

if (Member && User) {
  Member.belongsTo(User, { foreignKey: 'createdBy' });
}

// Define relationships within the Members table
if (Relationship && Member) {
  Relationship.belongsTo(Member, { as: 'Member', foreignKey: 'memberId', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
  Relationship.belongsTo(Member, { as: 'RelatedMember', foreignKey: 'relatedMemberId', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
}

// Verification of a member
if (User && VerifiedMember && Member) {
  VerifiedMember.belongsTo(User, { as: 'User', foreignKey: 'verifiedBy' });
  VerifiedMember.belongsTo(Member, { as: 'VerifiedMember', foreignKey: 'verifiedId' });
}

//Verification of a relationship
if (User && Relationship && VerifiedRelationship) {
  VerifiedRelationship.belongsTo(User, { as: 'User', foreignKey: 'verifiedBy', onDelete: 'CASCADE' });
  VerifiedRelationship.belongsTo(Relationship, { as: 'VerifiedRelationship', foreignKey: 'verifiedRelationshipId', onDelete: 'CASCADE' });
}

//Relationship in a family
if (Relationship && Family) {
  Relationship.belongsTo(Family, {as: 'Family', foreignKey: 'familyId' });
}

// users and members

if (User && Family && FamilyUser) {
  // Define the many-to-many relationship with FamilyUser as the junction table
  User.belongsToMany(Family, { through: FamilyUser, as: 'UserFamilies', foreignKey: 'userId' });
  Family.belongsToMany(User, { through: FamilyUser, as: 'FamilyUsers', foreignKey: 'familyId' });

  // Optional: Define the reverse association on FamilyUser for direct access
  FamilyUser.belongsTo(User, { foreignKey: 'userId' });
  FamilyUser.belongsTo(Family, { foreignKey: 'familyId' });
}

// Export models and Sequelize instance
module.exports = {
  sequelize,  // The Sequelize instance
  models,     // All models
};
