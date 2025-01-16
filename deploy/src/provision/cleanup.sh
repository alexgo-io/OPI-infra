#!/bin/bash -e

# Function to safely remove a file or directory
safe_remove() {
    if [ -e "$1" ]; then
        rm -rf "$1"
    fi
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to safely clean a directory
clean_directory() {
    local dir=$1
    if [ -d "$dir" ]; then
        find "$dir" -mindepth 1 -delete 2>/dev/null || true
    fi
}

# Record initial disk space
echo "Starting cleanup process..."
before=$(df / -Pm | awk 'NR==2{print $4}')

# Clean apt cache
if command_exists apt-get; then
    echo "Cleaning apt cache..."
    apt-get clean
fi

# Clean temporary directories
echo "Cleaning temporary directories..."
clean_directory "/tmp"
safe_remove "/root/.cache"

# Clean journald logs if journalctl exists
if command_exists journalctl; then
    echo "Cleaning journal logs..."
    journalctl --rotate
    journalctl --vacuum-time=1s
fi

# Clean log files
echo "Cleaning log files..."
if [ -d "/var/log" ]; then
    # Remove .gz files
    find /var/log -type f -name "*.gz" -delete 2>/dev/null || true

    # Remove rotated logs
    find /var/log -type f -regex ".*\.[0-9]$" -delete 2>/dev/null || true

    # Truncate remaining log files
    find /var/log -type f -exec truncate -s 0 {} \; 2>/dev/null || true
fi

# Remove test symlinks if they exist
safe_remove "/usr/local/bin/invoke_tests"

# Remove apt mock if it exists
for tool in apt apt-get apt-fast apt-key; do
    safe_remove "/usr/local/bin/$tool"
done

# Record final disk space
after=$(df / -Pm | awk 'NR==2{print $4}')
delta=$((after-before))

# Display results
echo "Cleanup completed!"
echo "Disk space before: $before MB"
echo "Disk space after : $after MB"
echo "Space freed     : $delta MB"
