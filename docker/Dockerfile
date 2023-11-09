FROM node:14

COPY mylinksbackend.js /
COPY package.json /
COPY swagger.yml /
RUN mkdir /models
COPY models/init-models.js /models
COPY models/LinkCategories.js /models
COPY models/MyLinks.js /models
COPY models/Users.js /models

RUN npm install
#RUN npm install --save express
#RUN npm install --save mssql
#RUN npm install --save request

EXPOSE 8080

CMD [ "node" , "/mylinksbackend.js" ]
