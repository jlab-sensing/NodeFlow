# pull official base image
FROM node:20.19.0-bullseye-slim AS development

# set working directory
WORKDIR /app

# add `/app/node_modules/.bin` to $PATH
# ENV PATH /app/frontend/node_modules/.bin:$PATH

# install app dependencies
COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json
COPY vite.config.js /app/vite.config.js

RUN ["npm", "ci"]
# RUN npm install nodemon --save-dev
COPY index.html ./index.html
COPY src ./src
COPY public ./public

# start app
CMD ["npm", "start", "--", "--host", "0.0.0.0", "--port", "81"]

EXPOSE 81