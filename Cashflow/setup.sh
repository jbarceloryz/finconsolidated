#!/bin/bash

# Setup script for Cash Flow Dashboard

echo "🚀 Setting up Cash Flow Dashboard..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    echo ""
    echo "Please install Node.js first:"
    echo "  - Visit https://nodejs.org/ and download the LTS version"
    echo "  - Or use Homebrew: brew install node"
    echo "  - Or use nvm: nvm install --lts"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v)
echo "✅ Found Node.js: $NODE_VERSION"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

NPM_VERSION=$(npm -v)
echo "✅ Found npm: $NPM_VERSION"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Setup complete!"
    echo ""
    echo "To start the development server, run:"
    echo "  npm run dev"
    echo ""
    echo "To build for production, run:"
    echo "  npm run build"
else
    echo ""
    echo "❌ Failed to install dependencies"
    exit 1
fi



