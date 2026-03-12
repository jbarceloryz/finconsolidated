# Cash Flow Dashboard

A React-based cash flow dashboard featuring a Payment Timeline chart that visualizes invoice payments by day of the month.

## Quick Start

**The dashboard is available at: http://localhost:5173/**

(If the server isn't running, start it with `npm run dev`)

## Features

- **Payment Timeline Chart**: Stacked bar chart showing daily payment amounts
- **Status-based Color Coding**:
  - Green: Paid invoices
  - Red: Overdue invoices
  - Gray: Upcoming invoices
- **Interactive Tooltips**: Detailed popup showing all clients for a specific day
- **TODAY Indicator**: Dotted vertical line marking the current day
- **Minimalist Design**: Clean, professional interface with pastel colors

## Development

1. **Start the development server:**
   ```bash
   npm run dev
   ```
   The dashboard will be available at **http://localhost:5173/**

2. **Build for production:**
   ```bash
   npm run build
   ```
   Built files will be in the `dist` folder

## Project Structure

- `src/components/PaymentTimeline.jsx` - Main chart component
- `src/components/CustomTooltip.jsx` - Custom tooltip component
- `src/utils/processCSV.js` - CSV data processing utilities
- `public/db.csv` - Invoice data source

## Technologies

- React 18
- Recharts 2
- Tailwind CSS 3
- Vite

## Ports

- **5173**: Development server (Vite) - **Use this one!**
- **8000**: Production build server (only if you run `./serve-built.sh`)
