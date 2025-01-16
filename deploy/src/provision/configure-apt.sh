#!/bin/bash -e

export DEBIAN_FRONTEND=noninteractive

# Function to check if a service exists
service_exists() {
    systemctl list-unit-files | grep -q "^$1"
}

# Function to check if a package is installed
is_package_installed() {
    dpkg -l "$1" 2>/dev/null | grep -q "^ii"
}

# Stop and disable apt-daily upgrade services if they exist
for service in apt-daily.timer apt-daily.service apt-daily-upgrade.timer apt-daily-upgrade.service; do
    if service_exists "$service"; then
        systemctl stop "$service" 2>/dev/null || true
        systemctl disable "$service" 2>/dev/null || true
    fi
done

# Configure apt settings only if they don't exist
for conf in "80-retries" "90assumeyes" "99-phased-updates" "99bad_proxy"; do
    if [ ! -f "/etc/apt/apt.conf.d/$conf" ]; then
        case "$conf" in
            "80-retries")
                echo 'APT::Acquire::Retries "10";' > "/etc/apt/apt.conf.d/$conf"
                ;;
            "90assumeyes")
                echo 'APT::Get::Assume-Yes "true";' > "/etc/apt/apt.conf.d/$conf"
                ;;
            "99-phased-updates")
                echo 'APT::Get::Always-Include-Phased-Updates "true";' > "/etc/apt/apt.conf.d/$conf"
                ;;
            "99bad_proxy")
                cat > "/etc/apt/apt.conf.d/$conf" <<EOF
Acquire::http::Pipeline-Depth 0;
Acquire::http::No-Cache true;
Acquire::BrokenProxy    true;
EOF
                ;;
        esac
    fi
done

# Uninstall unattended-upgrades if installed
if is_package_installed "unattended-upgrades"; then
    rm -rf /var/log/unattended-upgrades
    apt-get purge unattended-upgrades -y
fi

# Install required packages if not already installed
PACKAGES=(
    apt-transport-https
    ca-certificates
    curl
    software-properties-common
    gnupg
    wget
    git
    build-essential
    ncdu
    bpytop
    pbzip2
    lsb-release
)

# Create a list of packages that need to be installed
TO_INSTALL=()
for pkg in "${PACKAGES[@]}"; do
    if ! is_package_installed "$pkg"; then
        TO_INSTALL+=("$pkg")
    fi
done

# Only run apt-get if there are packages to install
if [ ${#TO_INSTALL[@]} -gt 0 ]; then
    # Update package list
    apt-get update -yq

    # Install missing packages
    apt-get install -yq "${TO_INSTALL[@]}"
fi

# Only run dist-upgrade if there are upgrades available
if apt-get -s dist-upgrade | grep -q "^Inst"; then
    apt-get -yq dist-upgrade
fi
