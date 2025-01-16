# OPI.network / Bitcoin Oracle integration

This project contains infrastructure code for deploying an [OPI](https://github.com/bestinslot-xyz/OPI) node on bare metal machines using Pulumi. It will provision the target machine, install Docker and other required software, and deploy the OPI stack including bitcoind, ord, postgres, and various indexers. It will also run the restoration script to restore the latest snapshot of the postgres database and ord database. After the restore is complete, it will run all services required.

## Contents

The project contains the following files:

- `.envrc` - Environment variable definitions
- `.tool-versions` - Tool versions
- `deploy/Pulumi.yaml` - Pulumi project configuration
- `deploy/package.json` - Node.js dependencies
- `deploy/Pulumi.dev.yaml` - Pulumi configuration for dev environment
- `configs/` - Configuration scripts

## Getting Started

### Prerequisites

1. Target machine requirements:
   - Ubuntu 22.04 LTS
   - SSH access with root or sudo privileges
   - Sufficient disk space (recommended: 1TB+)
   - Sufficient memory (recommended: 16GB+)
   - Fast network connection

2. Local machine requirements:
   - Node.js 20+
   - Pulumi CLI
   - SSH key pair for accessing target machines

### Environment Setup

Set the following environment variables:

```bash
# Path to your SSH private key for accessing target machines
export PRIVATE_KEY_PATH=""

# Database configuration
export DB_USER=""
export DB_PASSWD=""
export DB_DATABASE=""

# Bitcoin RPC configuration
export BITCOIN_RPC_USER=""
export BITCOIN_RPC_PASSWD=""
export BITCOIN_RPC_PORT=""

# Docker image configuration
export OPI_IMAGE=""
export BITCOIND_IMAGE=""

# set following name for report to OPI network.
# dashboard url: https://opi.network/
export REPORT_NAME=""
```

Make sure you run `direnv allow` so the new environment variables are applied.

### Configuration

Edit the file `deploy/src/config.yaml` to configure your target machines:

```yaml
services:
  opi1:  # Service name
    host: "192.168.1.100"  # Target machine IP or hostname
    user: "root"           # SSH user
    ssh_key_path: "~/.ssh/id_rsa"  # Path to SSH private key
    data_path: "/mnt/data" # Path where data will be stored
```

### Deploy

1. Install dependencies

```bash
cd deploy
pnpm install
```

2. Run pulumi up to deploy the infrastructure

```bash
cd deploy
pulumi up
```

This will provision the target machines and run the necessary OPI containers.

## SSH Config Setting

It's recommended to add the following to `~/.ssh/config` to avoid interrupted SSH connections while provisioning:

```
TCPKeepAlive yes
ServerAliveInterval 30
ServerAliveCountMax 4
```

# Resources

- [OPI Documentation](https://github.com/bestinslot-xyz/OPI)
- [asdf](https://asdf-vm.com/)
- [direnv](https://direnv.net/)
- [Pulumi](https://www.pulumi.com/)
- [Node.js](https://nodejs.org/)
- [Docker](https://www.docker.com/)
