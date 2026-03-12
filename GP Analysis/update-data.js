#!/usr/bin/env node
/**
 * Lee config.json (csvPath) y genera data.js con el contenido del CSV.
 * Uso: node update-data.js
 * Para cambiar el CSV: editá config.json (csvPath) y volvé a ejecutar este script.
 */

const fs = require('fs');
const path = require('path');

const dir = __dirname;
const configPath = path.join(dir, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const csvPath = path.resolve(dir, config.csvPath);

if (!fs.existsSync(csvPath)) {
  console.error('No se encontró el CSV en:', csvPath);
  console.error('Revisá config.json → csvPath.');
  process.exit(1);
}

const csv = fs.readFileSync(csvPath, 'utf8');
// Escapar para string en JS: \ -> \\, ` -> \`, $ -> \$, fin de línea y comillas
const escaped = csv
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$/g, '\\$')
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n');

const out = `// Generado por update-data.js desde config.json → csvPath. No editar a mano.
window.TALENT_POOL_CSV = \`${escaped}\`;
`;

fs.writeFileSync(path.join(dir, 'data.js'), out, 'utf8');
console.log('OK: data.js generado desde', config.csvPath);
