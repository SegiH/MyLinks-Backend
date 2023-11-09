var DataTypes = require("sequelize").DataTypes;
var _LinkCategories = require("./LinkCategories");
var _MyLinks = require("./MyLinks");
var _Users = require("./Users");

function initModels(sequelize) {
  var LinkCategories = _LinkCategories(sequelize, DataTypes);
  var MyLinks = _MyLinks(sequelize, DataTypes);
  var Users = _Users(sequelize, DataTypes);

  return {
    LinkCategories,
    MyLinks,
    Users
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
