#!/bin/bash -e
export DEBIAN_FRONTEND=noninteractive

# Function to check if an image exists locally
image_exists() {
    docker image inspect "$1" >/dev/null 2>&1
}

# Function to pull an image with retries
pull_image() {
    local image=$1
    local max_attempts=5
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        echo "Attempting to pull $image (attempt $attempt of $max_attempts)..."
        if docker pull "$image"; then
            echo "Successfully pulled $image"
            return 0
        fi
        attempt=$((attempt + 1))
        if [ $attempt -le $max_attempts ]; then
            echo "Pull failed, waiting before retry..."
            sleep 5
        fi
    done

    echo "Failed to pull $image after $max_attempts attempts"
    return 1
}

# Pull OPI image
if [ -z "$OPI_IMAGE" ]; then
    echo "Warning: OPI_IMAGE environment variable not set, using default"
    OPI_IMAGE="caoer/opi:latest"
fi
pull_image "$OPI_IMAGE"

# Pull Bitcoind image
if [ -z "$BITCOIND_IMAGE" ]; then
    echo "Warning: BITCOIND_IMAGE environment variable not set, using default"
    BITCOIND_IMAGE="caoer/bitcoind:latest"
fi
pull_image "$BITCOIND_IMAGE"

echo "All images pulled successfully"
