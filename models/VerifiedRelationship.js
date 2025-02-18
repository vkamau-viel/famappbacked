const { INTEGER } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    const VerifiedRelationship = sequelize.define('VerifiedRelationship', {
        verifiedRelationshipId: { type: DataTypes.INTEGER, allowNull:false},
        verifiedBy: { type:DataTypes.INTEGER, allowNull:false }
    },{
      indexes: [
        { 
          unique: true,
          fields: ['verifiedRelationshipId', 'verifiedBy'], // Composite unique index
                    
        }
      ]
    }
    );
return VerifiedRelationship;
};