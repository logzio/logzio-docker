# logzio-docker
#
# VERSION 2.0.0

FROM mhart/alpine-node:7.5.0
MAINTAINER Ran Ramati <ran@logz.io>
RUN apk add --no-cache bash

WORKDIR /usr/src/app
COPY package.json package.json
RUN npm install --production
RUN npm cache clean
COPY index.js /usr/src/app/index.js

ENTRYPOINT ["/usr/src/app/index.js"]
CMD []
