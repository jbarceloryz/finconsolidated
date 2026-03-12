#!/bin/bash

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js LTS if not already installed
if ! command -v node &> /dev/null; then
    echo "Installing Node.js LTS..."
    nvm install --lts
    nvm use --lts
    nvm alias default node
fi

# Verify installation
echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# Navigate to project directory
cd "$(dirname "$0")"

# Install dependencies
echo ""
echo "Installing project dependencies..."
npm install

# Start development server
echo ""
echo "Starting development server..."
echo "The dashboard will be available at http://localhost:5173"
echo ""
npm run dev



