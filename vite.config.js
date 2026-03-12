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

/** Serve GP Analysis at /gp-analysis/ in dev (index.html, data.js, etc.). */
function serveGPAnalysis() {
  return {
    name: 'serve-gp-analysis',
    configureServer(server) {
      const gpDir = path.join(__dirname, 'GP Analysis')
      server.middlewares.use('/gp-analysis', (req, res, next) => {
        const urlPath = req.url?.split('?')[0] || '/'
        const file = urlPath === '/' ? 'index.html' : urlPath.slice(1)
        const fullPath = path.join(gpDir, file)
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          const ext = path.extname(file)
          const types = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json' }
          res.setHeader('Content-Type', types[ext] || 'application/octet-stream')
          res.end(fs.readFileSync(fullPath, 'utf-8'))
        } else {
          next()
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [serveCashflowCsv(), serveNetIncomeCsv(), serveGPAnalysis(), react()],
  base: '/',
})
