'use strict';

const backend="SQLServer";
const bodyParser = require('body-parser');
//const Connection = require('tedious').Connection;
const cors = require('cors');
const express = require('express');
const fs = require("fs");
const path = require('path');
//const Request = require('tedious').Request;
const request = require("request");
const { Sequelize, Op } = require("sequelize");
const sql = require('mssql');
const swaggerUi = require("swagger-ui-express");
const util = require('util');
const YAML = require('yamljs');

const swaggerDocument = YAML.load("./swagger.yml");

// Constants
const PORT = 8080;
const HOST = '0.0.0.0';
const AUTH_KEY=process.env.AUTH_KEY;
const DBType = "MSSQL";
const DBFile = "mylinksdb.sqlite";

const corsOptions = {
     origin: ["http://localhost"],
     optionsSuccessStatus: 200,
     credentials: true
}
const config = {
     user: process.env.MyLinksBackend_User,
     password: process.env.MyLinksBackend_Password,
     server: process.env.MyLinksBackend_Host,
     database: process.env.MyLinksBackend_DB,
     trustServerCertificate: true
};

// Validation
if (typeof AUTH_KEY === 'undefined') {
     console.log("Auth Key not set!!!");
          process.exit(1);
}

if (typeof config.user === 'undefined') {
     console.log("DB username is not set!!!");
          process.exit(1);
}

if (typeof config.password === 'undefined') {
     console.log("DB password is not set!!!");
          process.exit(1);
}

if (typeof config.server === 'undefined') {
     console.log("DB server is not set!!!");
          process.exit(1);
}

if (typeof config.database === 'undefined') {
     console.log("DB database is not set!!!");
          process.exit(1);
}

// SQLite

/*const SQLiteSequelize = new Sequelize("DBName", "username", "password", {
  dialect: "sqlite",
  // we will be saving our db as a file on this path
  storage: DBFile, // or ':memory:'
  logging: false
});*/

const sequelize = new Sequelize(config.database, config.user, config.password, {
  host: config.server,
  encrypt: false,
  dialect: "mssql",
  logging: false,
  quoteIdentifiers: true,
  define: {
    freezeTableName: true,
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: {
    port: 1433,
  },
});

if (DBType === "MSSQL") {
  (async () => {
    try {
      await sequelize.authenticate();

    } catch (e) {
      console.log(`Sequelize encountered the error ${e.message} while connecting to the DB`);
      process.exit(0);
    }
  })();
}

const initModels = require("./models/init-models");
const models = initModels(sequelize);
//const models = initModels(DBType === "SQLite" ? SQLiteSequelize : MSSQLSequelize);
//const sequelize = DBType === "SQLite" ? SQLiteSequelize : MSSQLSequelize;

const app = express();
app.use(cors(corsOptions));

// Middleware that is called before any endpoint is reached
app.use(function (req, res, next) {
     const authorizationHeader = (typeof req.headers['authorization'] !== 'undefined' ? req.headers['authorization'] : null);
     const authorizationCapsHeader = (typeof req.headers['Authorization'] !== 'undefined' ? req.headers['Authorization'] : null);
     const authHeader = (typeof req.headers['auth'] !== 'undefined' ? req.headers['auth'] : null);

     const authToken = (typeof authorizationHeader !== 'undefined'
          ? authorizationHeader
          : (typeof authorizationCapsHeader !== 'undefined' 
               ? authorizationCapsHeader
               : (typeof authHeader !== 'undefined'
                    ? authHeader
                    :
                    null
               )
          )
     );

     if (req.url.toString().includes("/swagger")) { // Skip for Swagger endpoint
          next();
     } else if (authToken === null)
          return res.status(401).send("Auth token is empty");
     else {          		
          if (authToken.includes("Bearer ")) {
               const token = authToken.replace("Bearer ","");

               if (typeof token === 'undefined' || token === null)
                    return res.status(403).send('Auth token is null')
	       else if (token !== process.env.AUTH_KEY)
                    return res.status(403).send('Auth token is wrong')
	       else
	            next();
          }
     }
});

app.use(bodyParser.urlencoded({extended: false})); 
app.use(express.static('swagger'));

// Swagger endpoint
app.use(
     '/swagger',
     swaggerUi.serve, 
     swaggerUi.setup(swaggerDocument)
);

//Default route doesn't need to return anything 
app.get('/', (req, res) => {
     res.status(403).send('Unauthorized');
});

app.put('/AddCategory', async (req, res) => {
     const linkCategoryName=(typeof req.query.LinkCategoryName !== 'undefined' ? req.query.LinkCategoryName : null);
     const userID=(typeof req.query.UserID !== 'undefined' ? req.query.UserID : null);
    
     if (linkCategoryName === null)
          res.send(["Link category name was not provided"]);
     else {
          await models.LinkCategories.create({
               LinkCategoryName: linkCategoryName,
          })
          .then((result) => {
               // Return ID of newly inserted row
               res.send(["OK", result.LinkCategoryID]);
               return;
          })
         .catch(function (e) {
             const errorMsg = `/AddCategory: The error ${e.message} occurred while adding the Category`;
             console.error(errorMsg);
             res.send(["ERROR", errorMsg]);
             return;
          });
          /*let params = [['LinkCategoryName',sql.VarChar,linkCategoryName],["UserID",sql.Int,userID]];

          let columns=`LinkCategoryName,UserID`;
          let values = `@LinkCategoryName,@UserID`;

          const SQL=`INSERT INTO LinkCategories (${columns}) VALUES(${values})`;          
		  
          execSQL(res,SQL,params,false);*/
     }
});

app.put('/AddLink', async (req, res) => {
     const name=(typeof req.query.Name !== 'undefined' ? req.query.Name : null);
     const url=(typeof req.query.URL !== 'undefined' ? req.query.URL : null);
     const linkCategoryID=(typeof req.query.LinkCategoryID !== 'undefined' ? req.query.LinkCategoryID : null);
     const userID=(typeof req.query.UserID !== 'undefined' ? req.query.UserID : null);
    
     if (name === null) {
          res.send(["Name was not provided"]);
          return;
     } else if (url === null) {
          res.send(["URL was not provided"]);
          return;
     } else if (linkCategoryID === null) {
          res.send(["Link Category ID was not provided"]);
          return;
     } else if (userID === null) {
          res.send(["User ID was not provided"]);
          return;
     } else {
          await models.MyLinks.create({
               Name: name,
               URL: url,
               LinkCategoryID: linkCategoryID,
               UserID: userID
          })
          .then((result) => {
               // Return ID of newly inserted row
               res.send(["OK", result.LinkID]);
               return;
          })
         .catch(function (e) {
             const errorMsg = `/AddLink: The error ${e.message} occurred while adding the Link`;
             console.error(errorMsg);
             res.send(["ERROR", errorMsg]);
             return;
          });
          /*let params = [['Name',sql.VarChar,name],["URL",sql.VarChar,url],["LinkCategoryID",sql.Int,linkCategoryID],["UserID",sql.Int,userID]];

          let columns=`Name,URL,LinkCategoryID,UserID`;
          let values = `@Name,@URL,@LinkCategoryID,@UserID`;

          const SQL=`INSERT INTO MyLinks (${columns}) VALUES(${values})`;*/
          //const SQL=`INSERT INTO LinkCategories (${columns}) VALUES(${values})`;          
           //		  const SQL=`IF NOT EXISTS (SELECT * FROM LinkCategories WHERE LinkCategoryName=@LinkCategoryName) INSERT INTO LinkCategories (${columns}) VALUES(${values}) ELSE SELECT 'Category name exists already' AS Error`;
		  
          //execSQL(res,SQL,params,true);
     }
});

app.put('/AddUser', async (req, res) => {
     const userName=(typeof req.query.UserName !== 'undefined' ? req.query.UserName : null);
     const userDisplayName=(typeof req.query.UserDisplayName !== 'undefined' ? req.query.UserDisplayName : null);
    
     if (userName === null) {
          res.send(["UserName was not provided"]);a
          return;
     } else {
          await models.Users.create({
               UserName: userName,
               UserDisplayName: userDisplayName,
               Enabled: true
          })
          .then((result) => {
               // Return ID of newly inserted row
               res.send(["OK", result.UserID]);
               return;
          })
         .catch(function (e) {
             const errorMsg = `/AddUser: The error ${e.message} occurred while adding the User`;
             console.error(errorMsg);
             res.send(["ERROR", errorMsg]);
             return;
          });
          /*let params = [['UserName',sql.VarChar,userName],['UserDisplayName',sql.VarChar,userDisplayName]];

          let columns=`UserName,UserDisplayName`;
          let values = `@UserName,@UserDisplayName`;

          const SQL=`IF NOT EXISTS (SELECT * FROM Users WHERE UserName=@UserName) INSERT INTO Users (${columns}) VALUES (${values}) ELSE SELECT 'User name exists already' AS Error`;

          execSQL(res,SQL,params,true);*/
     }
});

app.put('/DeleteCategory', async (req, res) => {
     const linkCategoryID=(typeof req.query.LinkCategoryID !== 'undefined' ? req.query.LinkCategoryID : null);

     if (linkCategoryID === null) {
          res.send(["Link category ID was not provided"]);
          return;
     } else {
          const inUseValidation = await models.MyLinks.findOne({
               where: {
                    LinkCategoryID: linkCategoryID,
               }
          });

          if (inUseValidation != null) {
               res.send(["ERROR","Category is assigned to at least 1 link"]);
               return;
          } else {
               await LinkCategories.destroy({
                    where: {
                         LinkCategoryID: linkCategoryID
                    },
               });
          }

          /*let params = [['LinkCategoryID',sql.Int,linkCategoryID]];

          const SQL=`IF NOT EXISTS (SELECT * FROM MyLinks WHERE LinkCategoryID=@LinkCategoryID) DELETE FROM LinkCategories WHERE LinkCategoryID=@LinkCategoryID ELSE SELECT 'Category is assigned to at least 1 link' AS Error`

          execSQL(res,SQL,params,false);*/
     }
});

app.put('/DeleteLink', async (req, res) => {
     const linkID=(typeof req.query.LinkID !== 'undefined' ? req.query.LinkID : null);

     if (linkID === null)
          res.send(["LinkID was not provided"]);
     else {
          await MyLinks.destroy({
               where: {
                    LinkID: linkID
               },
          }) 
          .then((result) => {
               res.send(["OK", ""]);
               return;
          })
         .catch(function (e) {
             const errorMsg = `/DeleteLink: The error ${e.message} occurred while deleting the link`;
             console.error(errorMsg);
             res.send(["ERROR", errorMsg]);
             return;
          });
          /*let params = [['LinkID',sql.Int,linkID]];

          const SQL=`DELETE FROM MyLinks WHERE LinkID=@LinkID`;

          execSQL(res,SQL,params,false);*/
     }
});

app.put('/DeleteUser', async (req, res) => {
     const userID=(typeof req.query.UserID !== 'undefined' ? req.query.UserID : null);
    
     if (userID === null) {
          res.send(["User ID was not provided"]);
          return;
     } else {
          const inUseValidation = await models.MyLinks.findOne({
               where: {
                    UserID: userID,
               }
          });

          if (inUseValidation != null) {
               res.send(["ERROR","User has at least 1 link assigned to it"]);
               return;i
          }
          
          await Users.destroy({
               where: {
                    UserID: userID
               },
          })
          .then((result) => {
               res.send(["OK", ""]);
               return;
          })
          .catch(function (e) {
               const errorMsg = `/DeleteUser: The error ${e.message} occurred while deleting the user`;
               console.error(errorMsg);
               res.send(["ERROR", errorMsg]);
               return;
          });
     }
          /*let params = [['LinkID',sql.Int,linkID]];
               
           }
         /*await Users.destroy({
               where: {
                    UserID: {
                         [Op.or]: [null,userID]
                    }
               },
          });*/
          /*let params = [['UserID',sql.Int,userID]];

	  const SQL=`IF NOT EXISTS (SELECT * FROM MyLinks WHERE UserID=@UserID) DELETE FROM Users WHERE UserID=@UserID ELSE SELECT 'User has at least 1 link assigned to it' AS Error`

          execSQL(res,SQL,params,true);*/
});

app.get('/GetCategories', (req, res) => {
     const userID=(typeof req.query.UserID !== 'undefined' ? req.query.UserID : null);     
     
     models.LinkCategories.findAll({
          where: {
               UserID: {
                    [Op.or]: [null,userID]
               }
          }
    })
    .then((results) => {
         res.send(results);
         return;
    })
    .catch(function (err) {
         res.send(["ERROR", `/GetCategories: The error ${err} occurred getting the categories`]);
         return;
    });
      
     /*const SQL=`IF EXISTS (SELECT * FROM LinkCategories WHERE UserID=${userID}) SELECT * FROM LinkCategories WHERE UserID=${userID} ORDER BY LinkCategoryName ELSE SELECT * FROM LinkCategories WHERE UserID IS NULL ORDER BY LinkCategoryName `;

     execSQL(res,SQL,null,true);*/
});

app.get('/GetLinks', (req, res) => {
     const userID=(typeof req.query.UserID !== 'undefined' ? req.query.UserID : null);     
     
     if (userID === null) {
          res.send(["User ID was not provided"]);
          return;
     } else {
          models.LinkCategories.hasMany(models.MyLinks, {
               foreignKey: "LinkCategoryID",
          });
     
          models.MyLinks.belongsTo(models.LinkCategories, {
               foreignKey: "LinkCategoryID",
          });

          models.MyLinks.findAll({
               where: {
                    UserID: userID
               },
               include: [
                    {
                         model: models.LinkCategories,
                         required: true,
                    },
               ],
               order: [
                    ["Name"]
               ]
          })
          .then((results) => {
               res.send(results);
               return;
          })
          .catch(function (err) {
               res.send(["ERROR", `/GetLinks: The error ${err} occurred getting the links`]);
               return;
          });
          /*const SQL=`SELECT MyLinks.*,LinkCategories.LinkCategoryName FROM MyLinks LEFT JOIN LinkCategories ON LinkCategories.LinkCategoryID=MyLinks.LinkCategoryID WHERE MyLinks.UserID=${userID} ORDER BY Name`;

          execSQL(res,SQL,null,true);*/

     }
});

app.get('/GetUsers', (req, res) => {
     models.Users.findAll({
          where: { 
                Enabled: true
          },
          order: [
               ["UserName"]
               ]
          })
          .then((results) => {
               res.send(results);
               return;
          })
          .catch(function (err) {
               res.send(["ERROR", `/GetLinks: The error ${err} occurred getting the links`]);
               return;
          });
     
     /*const SQL=`SELECT * FROM Users ORDER BY UserName`;

     execSQL(res,SQL,null,true);*/
});

app.get('/GetUserName', (req, res) => {
     const userID=(typeof req.query.UserID !== 'undefined' ? req.query.UserID : null);
    
     if (userID === null) {
          res.send(["User ID was not provided"]);
          return;
     } else {
          models.Users.findAll({
               attributes: ['UserName'],
               where: {
                    UserID: userID
               },
          })
          .then((results) => {
               res.send(results);
               return;
          })
          .catch(function (err) {
               res.send(["ERROR", `/GetUserName: The error ${err} occurred getting the username`]);
               return;
          });
          /*let params = [['UserID',sql.Int,userID]];

          const SQL=`SELECT UserName FROM Users WHERE UserID=@UserID`;

          execSQL(res,SQL,params,true);*/
     }
});

app.put('/UpdateCategory', async (req, res) => {
     const linkCategoryID=(typeof req.query.LinkCategoryID !== 'undefined' ? req.query.LinkCategoryID : null);
     const linkCategoryName=(typeof req.query.LinkCategoryName !== 'undefined' ? req.query.LinkCategoryName : null);
	
     if (linkCategoryID === null) {
          res.send(["Link category ID was not provided"]);
          return;
     } else if (linkCategoryName === null) {
          res.send(["Link category name was not provided"]);
          return;
     } else {
          const updatedRowCount = await models.LinkCategories.update(
               {LinkCategoryName: linkCategoryName}
          ,{
               where: { LinkCategoryID: linkCategoryID}
          }).catch(function (e) {
               const errorMsg = `/UpdateCategory: The error ${e.message} occurred while updatingi the Link Category with ID ${linkCategoryID}`;
               res.send(["ERROR", errorMsg]);
               return;
          });

          res.send(["OK", updatedRowCount]);
          return;
          /*let params = [['LinkCategoryID',sql.Int,linkCategoryID],['LinkCategoryName',sql.VarChar,linkCategoryName]];

          const SQL=`UPDATE Categories SET LinkCategoryName=@LinkCategoryName WHERE LinkCategoryID=@LinkCategoryID`;

          execSQL(res,SQL,params,false);*/
     }
});

app.put('/UpdateLink', async (req, res) => {
     const linkID=(typeof req.query.LinkID !== 'undefined' ? req.query.LinkID : null);
     const name=(typeof req.query.Name !== 'undefined' ? req.query.Name : null);
     const url=(typeof req.query.URL !== 'undefined' ? req.query.URL : null);
     const linkCategoryID=(typeof req.query.LinkCategoryID !== 'undefined' ? req.query.LinkCategoryID : null);
    
     if (linkID === null) {
          res.send(["LinkID was not provided"]);
          return;
     } else if (name === null) {
          res.send(["Name was not provided"]);
          return;
     } else if (url === null) {
          res.send(["URL was not provided"]);
          return;
     } else if (linkCategoryID === null) {
          res.send(["Link Category ID was not provided"]);
          return;
     } else {
          const updatedRowCount = await models.MyLinks.update(
               {Name: name},
               {URL: url},
               {LinkCategoryID: linkCategoryID}
          ,{
               where: { 
                    LinkID: linkID
               }
          }).catch(function (e) {
               const errorMsg = `/UpdateLink: The error ${e.message} occurred while updating the link with ID ${linkID}`;
               res.send(["ERROR", errorMsg]);
               return;
          });

          res.send(["OK", updatedRowCount]);
          return;
          /*let params = [['LinkID',sql.Int,linkID],['Name',sql.VarChar,name],["URL",sql.VarChar,url],["LinkCategoryID",sql.Int,linkCategoryID]];

          let columns=`LinkID,Name,URL,LinkCategoryID`;
          let values = `@LinkID,@Name,@URL,@LinkCategoryID`;

          const SQL=`UPDATE MyLinks SET Name=@Name,URL=@URL,LinkCategoryID=@LinkCategoryID WHERE LinkID=@LinkID`

          execSQL(res,SQL,params,false);*/
     }
});

app.put('/UpdateUsers', async (req, res) => {
     const userID=(typeof req.query.UserID !== 'undefined' ? req.query.UserID : null);
     const userName=(typeof req.query.UserName !== 'undefined' ? req.query.UserName : null);
     const userDisplayName=(typeof req.query.UserDisplayName !== 'undefined' ? req.query.UserDisplayName : null);
     const enabled=(typeof req.query.Enabled !== 'undefined' && req.query.Enabled === "true" ? true : false);

     if (userID === null) {
          res.send(["User ID was not provided"]);
          return;
     } else if (userName === null) {
          res.send(["UserName was not provided"]);
          return;
     } else {
          const updatedRowCount = await models.Users.update(
               {UserName: userName},
               {UserDisplayName: userDisplayName},
               {Enabled: enabled}
          ,{
               where: { 
                    UserID: userID
               }
          }).catch(function (e) {
               const errorMsg = `/UpdateUsers: The error ${e.message} occurred while updating the users with ID ${userID}`;
               res.send(["ERROR", errorMsg]);
               return;
          });

          res.send(["OK", updatedRowCount]);
          return;
          /*let params = [['UserID',sql.Int,userID],['UserName',sql.VarChar,userName],['UserDisplayName',sql.VarChar,userDisplayName]];

          const SQL=`UPDATE Users SET UserName=@UserName,UserDisplayName=@UserDisplayName WHERE UserID=@UserID`

          execSQL(res,SQL,params,false);*/
     }
});

/*function execSQL(res,SQL,params,returnsData) {
     try {
          var connection = new Connection(config);

          sql.connect(config,function (err) {
               if (err) {
                    console.log(err);
                    res.send(`An error occurred connecting to the database with the error ${err}`);
               } else {
                    const request = new sql.Request();
                    
                    if (params != null) { // parameterize SQL query parameters which are in format [Name,Type,Value]
                         for (let i=0;i<params.length;i++) {
                                   request.input(params[i][0],params[i][1],params[i][2]);
                         }
                    }

                    request.query(SQL,function (err,data) {
                         if (err) res.send(["ERROR",err])
							 
						 else if (returnsData)  // if the command returns data which could be a select or a non-select that returns an error message 
                              try {
                                   res.send(data.recordset);
                              } catch(error) {
                                   console.log(`The error ${error} occurred with the SQL query ${SQL} and the params ${params}`);
								   res.send(`An error fetching the data with the error ${error}`);
                              } 
                         else
                              res.send(["OK",""]);
                    });
               }
          });
     } catch(e) {
          console.log("Error!");
          res.send("Error is " + e);
     }
}*/

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
