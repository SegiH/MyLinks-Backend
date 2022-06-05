FROM node:14

COPY mylinksbackend.js /
COPY package.json /
COPY swagger.yml /

RUN npm install
#RUN npm install --save express
#RUN npm install --save mssql
#RUN npm install --save request

EXPOSE 8080

CMD [ "node" , "/mylinksbackend.js" ]
