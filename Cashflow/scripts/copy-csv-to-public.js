/**
 * Copies db.csv from project root to public/db.csv so the build serves it.
 * Run before build so the app always uses the root folder CSV in production.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const src = path.join(root, 'db.csv')
const dest = path.join(root, 'public', 'db.csv')

if (!fs.existsSync(src)) {
  console.warn('copy-csv-to-public: db.csv not found in project root, skipping.')
  process.exit(0)
}
fs.copyFileSync(src, dest)
console.log('copy-csv-to-public: copied db.csv from root to public/db.csv')
