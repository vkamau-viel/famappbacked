module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
    userName: { type: DataTypes.STRING, unique: true, allowNull: false, },
    email: { type: DataTypes.STRING, unique: true, allowNull: false, },
    phoneNumber: { type: DataTypes.STRING, unique: true, allowNull: true, },
    password: { type: DataTypes.STRING, allowNull: false, },
    verificationCode: { type: DataTypes.STRING, },
    reset_token: { type: DataTypes.STRING, },
    reset_token_expiry: { type: DataTypes.DATE, },
    isEmailVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
    profileImage: { type: DataTypes.STRING, allowNull: true, },
})

return User;
};
