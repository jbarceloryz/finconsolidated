import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Serve db.csv from Cashflow folder at /db.csv in dev. */
function serveCashflowCsv() {
  return {
    name: 'serve-cashflow-csv',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const p = req.url?.split('?')[0]
        if (p === '/db.csv') {
          const csvPath = path.join(__dirname, 'Cashflow', 'db.csv')
          if (fs.existsSync(csvPath)) {
            res.setHeader('Content-Type', 'text/csv')
            res.end(fs.readFileSync(csvPath, 'utf-8'))
          } else {
            res.statusCode = 404
            res.end('db.csv not found in Cashflow folder')
          }
          return
        }
        next()
      })
    },
  }
}

/** Serve Net Income CSV from Net Income Project at /net-income-data.csv in dev. */
function serveNetIncomeCsv() {
  return {
    name: 'serve-net-income-csv',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const p = req.url?.split('?')[0]
        if (p === '/net-income-data.csv') {
          const csvPath = path.join(__dirname, 'Net Income Project', 'src', 'assets', 'data.csv')
          if (fs.existsSync(csvPath)) {
            res.setHeader('Content-Type', 'text/csv')
            res.end(fs.readFileSync(csvPath, 'utf-8'))
          } else {
            res.statusCode = 404
            res.end('net-income data.csv not found')
          }
          return
        }
        next()
      })
    },
  }
}

// GP Analysis is served from public/gp-analysis/ (symlink → GP Analysis/)
// Vite's static asset server handles it natively — no custom middleware needed.

export default defineConfig({
  plugins: [serveCashflowCsv(), serveNetIncomeCsv(), react()],
  base: '/',
})
