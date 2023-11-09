const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('LinkCategories', {
    LinkCategoryID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    LinkCategoryName: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
}, {
    sequelize,
    tableName: 'LinkCategories',
    timestamps: false
  });
};

