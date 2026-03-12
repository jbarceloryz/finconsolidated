#!/bin/bash
cd "$(dirname "$0")"

if ! command -v npm &>/dev/null; then
  echo "Node.js no está instalado."
  echo ""
  echo "1. Instálalo desde https://nodejs.org (descarga la versión LTS)"
  echo "   o con Homebrew: brew install node"
  echo ""
  echo "2. Cierra esta ventana, abre una terminal nueva y vuelve a ejecutar este script."
  echo ""
  read -p "Pulsa Enter para cerrar..."
  exit 1
fi

echo "Instalando dependencias..."
npm install

if [ $? -ne 0 ]; then
  echo "Error al instalar. Revisa la salida anterior."
  read -p "Pulsa Enter para cerrar..."
  exit 1
fi

echo ""
echo "Iniciando el servidor. Abre en el navegador la URL que aparece abajo (ej. http://localhost:5173)"
echo ""
npm run dev
