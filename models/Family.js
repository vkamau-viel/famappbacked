module.exports = (sequelize, DataTypes) => {
    const Family = sequelize.define('Family', {
      familyName: { type: DataTypes.STRING, allowNull: false, unique: true, },
      description: DataTypes.STRING,
      origin: DataTypes.STRING,
      country: DataTypes.STRING,
      county: DataTypes.STRING,
      location: DataTypes.STRING,
      tribe: DataTypes.STRING,
      verifications: { type: DataTypes.INTEGER, defaultValue: 3 },
      updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    });
  
    return Family;
  };
  