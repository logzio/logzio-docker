# logzio-docker
#
# VERSION 1.0.0

FROM mhart/alpine-node:5.10.1
MAINTAINER Ran Ramati <ran@logz.io>
RUN apk add --no-cache bash

WORKDIR /usr/src/app
COPY package.json package.json
RUN npm install --production
RUN npm cache clean
COPY index.js /usr/src/app/index.js
COPY ./docker-entrypoint.sh /

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD []
