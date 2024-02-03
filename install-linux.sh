#!/bin/bash

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script requires root privileges. Please run it with sudo."
   exit 1
fi

# Install Node.js if not already installed
if ! command -v node &> /dev/null; then
    curl -sL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "Node.js is already installed."
fi

# Install Volta if not already installed
if ! command -v volta &> /dev/null; then
    curl https://get.volta.sh | bash
else
    echo "Volta is already installed."
fi

# Install FFmpeg if not already installed
if ! command -v ffmpeg &> /dev/null; then
    sudo apt-get update
    sudo apt-get install ffmpeg -y
else
    echo "FFmpeg is already installed."
fi

# Run npm install
npm install

# Run Node.js script
node SHPBOT
