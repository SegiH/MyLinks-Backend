'use strict';

const backend="SQLServer";
const bodyParser = require('body-parser');
const Connection = require('tedious').Connection;
const express = require('express');
const fs = require("fs");
const path = require('path');
const Request = require('tedious').Request;
const sql = require('mssql');
const swaggerUi = require("swagger-ui-express");
const util = require('util');
const YAML = require('yamljs');

const swaggerDocument = YAML.load("./swagger.yml");

// Constants
const PORT = 8080;
const HOST = '0.0.0.0';
const AUTH_KEY=process.env.AUTH_KEY;

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

const app = express();

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

app.put('/AddCategory', (req, res) => {
     const linkCategoryName=(typeof req.query.LinkCategoryName !== 'undefined' ? req.query.LinkCategoryName : null);
     const userID=(typeof req.query.UserID !== 'undefined' ? req.query.UserID : null);
    
     if (linkCategoryName === null)
          res.send(["Link category name was not provided"]);
     else {
          let params = [['LinkCategoryName',sql.VarChar,linkCategoryName],["UserID",sql.Int,userID]];

          let columns=`LinkCategoryName,UserID`;
          let values = `@LinkCategoryName,@UserID`;

          const SQL=`INSERT INTO LinkCategories (${columns}) VALUES(${values})`;          
		  
          execSQL(res,SQL,params,false);
     }
});

app.put('/AddLink', (req, res) => {
     const name=(typeof req.query.Name !== 'undefined' ? req.query.Name : null);
     const url=(typeof req.query.URL !== 'undefined' ? req.query.URL : null);
     const linkCategoryID=(typeof req.query.LinkCategoryID !== 'undefined' ? req.query.LinkCategoryID : null);
     const userID=(typeof req.query.UserID !== 'undefined' ? req.query.UserID : null);
    
     if (name === null)
          res.send(["Name was not provided"]);
     else if (url === null)
          res.send(["URL was not provided"]);
     else if (linkCategoryID === null)
          res.send(["Link Category ID was not provided"]);
     else if (userID === null)
          res.send(["User ID was not provided"]);
     else {
          let params = [['Name',sql.VarChar,name],["URL",sql.VarChar,url],["LinkCategoryID",sql.Int,linkCategoryID],["UserID",sql.Int,userID]];

          let columns=`Name,URL,LinkCategoryID,UserID`;
          let values = `@Name,@URL,@LinkCategoryID,@UserID`;

          const SQL=`INSERT INTO MyLinks (${columns}) VALUES(${values})`;          
          //const SQL=`INSERT INTO LinkCategories (${columns}) VALUES(${values})`;          
           //		  const SQL=`IF NOT EXISTS (SELECT * FROM LinkCategories WHERE LinkCategoryName=@LinkCategoryName) INSERT INTO LinkCategories (${columns}) VALUES(${values}) ELSE SELECT 'Category name exists already' AS Error`;
		  
          execSQL(res,SQL,params,true);
     }
});

app.put('/AddUser', (req, res) => {
     const userName=(typeof req.query.UserName !== 'undefined' ? req.query.UserName : null);
     const userDisplayName=(typeof req.query.UserDisplayName !== 'undefined' ? req.query.UserDisplayName : null);
    
     if (userName === null)
          res.send(["UserName was not provided"]);
     else {
          let params = [['UserName',sql.VarChar,userName],['UserDisplayName',sql.VarChar,userDisplayName]];

          let columns=`UserName,UserDisplayName`;
          let values = `@UserName,@UserDisplayName`;

          const SQL=`IF NOT EXISTS (SELECT * FROM Users WHERE UserName=@UserName) INSERT INTO Users (${columns}) VALUES (${values}) ELSE SELECT 'User name exists already' AS Error`;

          execSQL(res,SQL,params,true);
     }
});

app.put('/DeleteCategory', (req, res) => {
     const linkCategoryID=(typeof req.query.LinkCategoryID !== 'undefined' ? req.query.LinkCategoryID : null);

     if (linkCategoryID === null)
          res.send(["Link category ID was not provided"]);
     else {
          let params = [['LinkCategoryID',sql.Int,linkCategoryID]];

          const SQL=`IF NOT EXISTS (SELECT * FROM MyLinks WHERE LinkCategoryID=@LinkCategoryID) DELETE FROM LinkCategories WHERE LinkCategoryID=@LinkCategoryID ELSE SELECT 'Category is assigned to at least 1 link' AS Error`

          execSQL(res,SQL,params,false);
     }
});

app.put('/DeleteLink', (req, res) => {
     const linkID=(typeof req.query.LinkID !== 'undefined' ? req.query.LinkID : null);

     if (linkID === null)
          res.send(["LinkID was not provided"]);
     else {
          let params = [['LinkID',sql.Int,linkID]];

          const SQL=`DELETE FROM MyLinks WHERE LinkID=@LinkID`;

          execSQL(res,SQL,params,false);
     }
});

app.put('/DeleteUser', (req, res) => {
     const userID=(typeof req.query.UserID !== 'undefined' ? req.query.UserID : null);
    
     if (userID === null)
          res.send(["User ID was not provided"]);
     else {
          let params = [['UserID',sql.Int,userID]];

	  const SQL=`IF NOT EXISTS (SELECT * FROM MyLinks WHERE UserID=@UserID) DELETE FROM Users WHERE UserID=@UserID ELSE SELECT 'User has at least 1 link assigned to it' AS Error`

          execSQL(res,SQL,params,true);
     }
});

app.get('/GetCategories', (req, res) => {
     const userID=(typeof req.query.UserID !== 'undefined' ? req.query.UserID : null);     
     
     // Users can have custom categories. If the current user has at least 1 custom category, all custom categories for that user will be returned. Otherwise all rows where UserID IS NULL will be returned
     const SQL=`IF EXISTS (SELECT * FROM LinkCategories WHERE UserID=${userID}) SELECT * FROM LinkCategories WHERE UserID=${userID} ORDER BY LinkCategoryName ELSE SELECT * FROM LinkCategories WHERE UserID IS NULL ORDER BY LinkCategoryName `;

     execSQL(res,SQL,null,true);
});

app.get('/GetLinks', (req, res) => {
     const userID=(typeof req.query.UserID !== 'undefined' ? req.query.UserID : null);     
     
     if (userID === null)
          res.send(["User ID was not provided"]);
     else {
          const SQL=`SELECT MyLinks.*,LinkCategories.LinkCategoryName FROM MyLinks LEFT JOIN LinkCategories ON LinkCategories.LinkCategoryID=MyLinks.LinkCategoryID WHERE MyLinks.UserID=${userID} ORDER BY Name`;

          execSQL(res,SQL,null,true);
     }
});

app.get('/GetUsers', (req, res) => {
     const SQL=`SELECT * FROM Users ORDER BY UserName`;

     execSQL(res,SQL,null,true);
});

app.get('/GetUserName', (req, res) => {
     const userID=(typeof req.query.UserID !== 'undefined' ? req.query.UserID : null);
    
     if (userID === null)
          res.send(["User ID was not provided"]);
     else {
          let params = [['UserID',sql.Int,userID]];

          const SQL=`SELECT UserName FROM Users WHERE UserID=@UserID`;

          execSQL(res,SQL,params,true);
     }
});

app.put('/UpdateCategory', (req, res) => {
     const linkCategoryID=(typeof req.query.LinkCategoryID !== 'undefined' ? req.query.LinkCategoryID : null);
     const linkCategoryName=(typeof req.query.LinkCategoryName !== 'undefined' ? req.query.LinkCategoryName : null);
	
     if (linkCategoryID === null)
          res.send(["Link category ID was not provided"]);
     else if (linkCategoryName === null)
          res.send(["Link category name was not provided"]);
     else {
          let params = [['LinkCategoryID',sql.Int,linkCategoryID],['LinkCategoryName',sql.VarChar,linkCategoryName]];

          const SQL=`UPDATE Categories SET LinkCategoryName=@LinkCategoryName WHERE LinkCategoryID=@LinkCategoryID`;

          execSQL(res,SQL,params,false);
     }
});

app.put('/UpdateLink', (req, res) => {
     const linkID=(typeof req.query.LinkID !== 'undefined' ? req.query.LinkID : null);
     const name=(typeof req.query.Name !== 'undefined' ? req.query.Name : null);
     const url=(typeof req.query.URL !== 'undefined' ? req.query.URL : null);
     const linkCategoryID=(typeof req.query.LinkCategoryID !== 'undefined' ? req.query.LinkCategoryID : null);
    
     if (linkID === null)
          res.send(["LinkID was not provided"]);
     else if (name === null)
          res.send(["Name was not provided"]);
     else if (url === null)
          res.send(["URL was not provided"]);
     else if (linkCategoryID === null)
          res.send(["Link Category ID was not provided"]);
     else {
          let params = [['LinkID',sql.Int,linkID],['Name',sql.VarChar,name],["URL",sql.VarChar,url],["LinkCategoryID",sql.Int,linkCategoryID]];

          let columns=`LinkID,Name,URL,LinkCategoryID`;
          let values = `@LinkID,@Name,@URL,@LinkCategoryID`;

          const SQL=`UPDATE MyLinks SET Name=@Name,URL=@URL,LinkCategoryID=@LinkCategoryID WHERE LinkID=@LinkID`

          execSQL(res,SQL,params,false);
     }
});

app.put('/UpdateUsers', (req, res) => {
     const userID=(typeof req.query.UserID !== 'undefined' ? req.query.UserID : null);
     const userName=(typeof req.query.UserName !== 'undefined' ? req.query.UserName : null);
     const userDisplayName=(typeof req.query.UserDisplayName !== 'undefined' ? req.query.UserDisplayName : null);

     if (userID === null)
          res.send(["User ID was not provided"]);
     else if (userName === null)
          res.send(["UserName was not provided"]);
     else {
          let params = [['UserID',sql.Int,userID],['UserName',sql.VarChar,userName],['UserDisplayName',sql.VarChar,userDisplayName]];

          const SQL=`UPDATE Users SET UserName=@UserName,UserDisplayName=@UserDisplayName WHERE UserID=@UserID`

          execSQL(res,SQL,params,false);
     }
});

function execSQL(res,SQL,params,returnsData) {
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
}

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
