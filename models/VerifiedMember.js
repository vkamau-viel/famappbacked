module.exports = (sequelize, DataTypes) => {
    const VerifiedMember = sequelize.define('VerifiedMember', {
        verifiedId: { type: DataTypes.INTEGER, allowNull:false},
        verifiedBy: { type:DataTypes.INTEGER, allowNull:false }
    },{
      indexes: [
        {
          unique: true,
          fields: ['verifiedBy', 'verifiedId'],
        },
      ],
    }
    );
return VerifiedMember;
};
