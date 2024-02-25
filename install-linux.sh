#!/bin/bash

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script requires root privileges. Please run it with sudo."
   exit 1
fi

echo "=============== SHPxBOT Installer ====================="

# Install Node.js and Python if not already installed
echo "Checking NodeJS and Python installation...."
if ! command -v node &> /dev/null; then
    echo "NodeJS is not installed. Attempting to install NodeJS and Python..."
    sudo apt-get update
    sudo apt-get install nodejs python3 -y
    sleep 2
else
    echo "Nodejs and Python are already installed."
fi

echo "Checking Git installation...."
# Install Git if not already installed
if ! command -v git &> /dev/null; then
    echo "Git is not installed. Attempting to install Git..."
    sudo apt-get install git -y
    sleep 2
else
    echo "Git is already installed."
fi

echo "Checking FFMPEG installation...."
# Install FFmpeg if not already installed
if ! command -v ffmpeg &> /dev/null; then
    echo "FFMPEG is not installed. Installing FFMPEG..."
    sudo apt-get install ffmpeg -y
    sleep 2
else
    echo "FFMPEG is already installed."
fi

echo "=============== SHPxBOT Installation Success ====================="

echo "Installing Dependencies & Running BOT...."
# Run npm install
npm install

# Run Node.js script
node SHPBOT
