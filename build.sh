#!/usr/bin/env bash
set -Eeo pipefail

pushd docker/opi && docker build --platform linux/amd64 -t $OPI_IMAGE . && popd;
pushd docker/bitcoind && docker build --platform linux/amd64 -t $BITCOIND_IMAGE . && popd;

docker push $OPI_IMAGE;
docker push $BITCOIND_IMAGE;
