#!/bin/bash

# Simple server script to serve the built dashboard

cd "$(dirname "$0")/dist"

echo "🚀 Serving Cash Flow Dashboard..."
echo ""
echo "📊 Dashboard available at: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Try Python 3 first, then Python 2, then PHP
if command -v python3 &> /dev/null; then
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    python -m SimpleHTTPServer 8000
elif command -v php &> /dev/null; then
    php -S localhost:8000
else
    echo "❌ No suitable server found. Please install Python 3, Python 2, or PHP"
    echo ""
    echo "Or use Node.js:"
    echo "  npx serve dist"
    exit 1
fi



