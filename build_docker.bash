#!/usr/bin/env bash

if [ `basename $PWD` != "logzio-docker" ]; then
    echo "This script should be run from logzio-docker directory as it relies on relative paths"
    exit 1
fi

VERSION=v2.4

#DOCKER_REGISTRY=registry.internal.logz.io:5000
IMAGE_NAME=logzio/logzio-docker

docker build -t $IMAGE_NAME .
docker tag $IMAGE_NAME $IMAGE_NAME:$VERSION
docker tag $IMAGE_NAME $IMAGE_NAME:latest

#docker push $DOCKER_REGISTRY/$IMAGE_NAME:$VERSION
#docker push $DOCKER_REGISTRY/$IMAGE_NAME:latest
