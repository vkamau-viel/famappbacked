module.exports = (sequelize, DataTypes) => {
    const Member = sequelize.define('Member', {
      firstName: { type: DataTypes.STRING, allowNull: false, },
      middleName: { type: DataTypes.STRING, allowNull: true, },
      lastName: { type: DataTypes.STRING, allowNull: false, },
      nickName: { type: DataTypes.STRING, allowNull: true, },
      gender: { type: DataTypes.STRING, allowNull: false, },
      phoneNumber: { type: DataTypes.TEXT, allowNull: true, },
      email: { type: DataTypes.STRING, allowNull: true },
      dateOfBirth: { type: DataTypes.DATE, allowNull: false, },
      dobQualifier: { type: DataTypes.STRING, allowNull: false, },
      dateOfDeath: { type: DataTypes.DATE, allowNull: true, },
      dodQualifier: { type: DataTypes.STRING, allowNull: true, },
      description: { type: DataTypes.TEXT, allowNull: true, },
      memberImage: { type: DataTypes.TEXT, allowNull: true, },
      updatedBy: { type: DataTypes.TEXT, allowNull: true },
      role: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'member' },
      verified: { type: DataTypes.INTEGER, allowNull:true, defaultValue: 0 },
      placeOfBirth: { type: DataTypes.TEXT, allowNull: true, },
      placeOfDeath: { type: DataTypes.TEXT, allowNull: true },
      active: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
    });
  
    return Member;
  };
  