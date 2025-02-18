  module.exports = (sequelize, DataTypes) => {
    const Relationship = sequelize.define( 'Relationship', {
        relationshipType: { type: DataTypes.TEXT, allowNull: false, },
        rTQualifier: { type: DataTypes.TEXT, allowNull: true, },
        verified: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      },
      {
        primaryKey: false, // Disables the default primary key
        indexes: [
          {
            unique: true,
            fields: ['memberId', 'relatedMemberId'], // Composite unique index
          },
        ],
      }
    );
  
    return Relationship;
  };
  