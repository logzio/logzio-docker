# logzio-docker
#
# VERSION 2.0.1

FROM mhart/alpine-node:7.5.0
MAINTAINER Ran Ramati <ran@logz.io>
RUN apk add --no-cache bash && rm -rf /var/cache/apk/*
WORKDIR /usr/src/app
COPY package.json package.json
RUN npm install --production && npm cache clean
COPY *.js /usr/src/app/
ENTRYPOINT ["/usr/src/app/index.js"]
CMD []
