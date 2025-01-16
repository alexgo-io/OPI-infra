#!/bin/bash -e

## Common
export DEBIAN_FRONTEND=noninteractive

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a service is active
service_is_active() {
    systemctl is-active --quiet "$1"
}

# Function to check if a service is enabled
service_is_enabled() {
    systemctl is-enabled --quiet "$1"
}

# Install Docker if not already installed
if ! command_exists docker; then
    echo "Installing Docker..."
    ATTEMPTS=0
    MAX_ATTEMPTS=5
    while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
        if curl -fsSL https://get.docker.com | sh; then
            break
        fi
        ATTEMPTS=$((ATTEMPTS+1))
        sleep 5
        if [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; then
            echo "Failed to install Docker after $MAX_ATTEMPTS attempts."
            exit 1
        fi
    done
else
    echo "Docker is already installed"
fi

# Start and enable docker service if needed
if ! service_is_active docker.service; then
    echo "Starting Docker service..."
    systemctl start docker.service
fi

if ! service_is_enabled docker.service; then
    echo "Enabling Docker service..."
    systemctl enable docker.service
fi

# Wait for Docker to be ready
echo "Waiting for Docker to be ready..."
TIMEOUT=30
while [ $TIMEOUT -gt 0 ]; do
    if docker info >/dev/null 2>&1; then
        break
    fi
    sleep 1
    TIMEOUT=$((TIMEOUT-1))
done

if [ $TIMEOUT -eq 0 ]; then
    echo "Timeout waiting for Docker to be ready"
    exit 1
fi

# Install docker-compose if not already installed
if ! command_exists docker-compose; then
    echo "Installing Docker Compose..."
    # Get the latest version of Docker Compose
    LATEST_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep -Po '"tag_name": "\K.*?(?=")')

    # Download Docker Compose
    sudo curl -L "https://github.com/docker/compose/releases/download/${LATEST_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

    # Apply executable permissions
    sudo chmod +x /usr/local/bin/docker-compose

    # Install command completion for bash
    sudo curl -L "https://raw.githubusercontent.com/docker/compose/${LATEST_COMPOSE_VERSION}/contrib/completion/bash/docker-compose" -o /etc/bash_completion.d/docker-compose
else
    echo "Docker Compose is already installed"
fi

# Verify installations
echo "Verifying installations..."
docker --version
docker-compose --version

echo "Setup completed successfully"
