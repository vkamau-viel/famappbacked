module.exports = (sequelize, DataTypes) => {
    const FamilyUser = sequelize.define('FamilyUser', {
        userId: { type: DataTypes.INTEGER, allowNull: false },
        familyId: { type: DataTypes.INTEGER, allowNull: false },
        isEnabled: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        isActive: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        isAdmin: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        confirmedBy: { type: DataTypes.INTEGER, allowNull: true}
    },
    {
        primaryKey: false, // Disables the default primary key
        indexes: [
          {
            unique: true,
            fields: ['familyId', 'userId'], // Composite unique index
          },
        ],
      });
  
    return FamilyUser;
  };
  