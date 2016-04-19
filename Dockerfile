# docker-logzio
#
# VERSION 0.2.0

FROM node:0.12-onbuild
MAINTAINER Ran Ramati <ran@logz.io>

ENTRYPOINT ["/usr/src/app/index.js"]
CMD []
