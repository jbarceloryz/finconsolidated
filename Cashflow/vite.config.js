import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Serves db.csv from project root at /db.csv in dev (so app always uses root folder CSV). */
function serveRootCsv() {
  return {
    name: 'serve-root-csv',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const p = req.url?.split('?')[0]
        if (p === '/db.csv') {
          const csvPath = path.join(__dirname, 'db.csv')
          if (fs.existsSync(csvPath)) {
            res.setHeader('Content-Type', 'text/csv')
            res.end(fs.readFileSync(csvPath, 'utf-8'))
          } else {
            res.statusCode = 404
            res.end('db.csv not found in project root')
          }
          return
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [serveRootCsv(), react()],
  base: '/', // so asset paths work on Amplify (e.g. /assets/index-xxx.js)
})



