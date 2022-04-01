FROM node:alpine3.12 
COPY docker/qemu-*-static /usr/bin/
COPY . /app
WORKDIR /app

RUN npm install -g nodemon
RUN npm install && mv /app/node_modules /node_modules
RUN npm i npm-run-all -D

EXPOSE 8080
EXPOSE 8081
CMD [ "nodemon", "--legacy-watch" , "--ext", "js,mjs,json,md", "--delay", "300", "--watch", "posts", "--watch", "notes", "--watch", "_includes"]