const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Users', {
    UserID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    UserName: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    UserDisplayName: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    Enabled: {
      type: DataTypes.BOOLEAN,
      allownull: false 
    }
}, {
    sequelize,
    tableName: 'Users',
    timestamps: false
  });
};

