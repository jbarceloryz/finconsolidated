# Installation Instructions

## Prerequisites

You need to have Node.js installed on your system. The project requires Node.js version 16 or higher.

### Installing Node.js

**Option 1: Download from nodejs.org (Recommended)**
1. Visit https://nodejs.org/
2. Download the LTS (Long Term Support) version
3. Run the installer and follow the instructions

**Option 2: Using Homebrew (macOS)**
```bash
brew install node
```

**Option 3: Using nvm (Node Version Manager)**
```bash
# Install nvm first (if not already installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js LTS
nvm install --lts
nvm use --lts
```

## Setup

Once Node.js is installed, you can set up the project in two ways:

### Option 1: Using the setup script
```bash
./setup.sh
```

### Option 2: Manual setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Running the Application

After installation:

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open your browser:**
   The terminal will display a URL (usually `http://localhost:5173`)
   Open this URL in your browser to see the dashboard

3. **Build for production:**
   ```bash
   npm run build
   ```
   The built files will be in the `dist` folder

## Troubleshooting

- **"command not found: npm"**: Node.js is not installed or not in your PATH
- **Port already in use**: Change the port in `vite.config.js` or kill the process using the port
- **CSV not loading**: Make sure `db.csv` exists in the `public` folder



