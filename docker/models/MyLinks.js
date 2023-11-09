const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('MyLinks', {
    LinkID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    Name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    URL: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    LinkCategoryID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    UserID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
}, {
    sequelize,
    tableName: 'MyLinks',
    //schema: 'dbo',
    timestamps: false
  });
};

