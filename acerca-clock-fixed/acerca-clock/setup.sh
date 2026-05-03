#!/usr/bin/env bash
# Script de arranque local para Acerca Clock.
# Ejecuta: bash setup.sh

set -e

echo "▶ Acerca Clock — setup local"
echo

# 1. Comprobar Node.js >= 18
if ! command -v node >/dev/null 2>&1; then
  echo "✗ Node.js no encontrado. Instala Node 18 o superior antes de continuar."
  exit 1
fi
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "✗ Node.js $NODE_MAJOR detectado. Se requiere Node 18+."
  exit 1
fi
echo "✓ Node $(node --version)"

# 2. Crear .env.local si no existe
if [ ! -f .env.local ]; then
  cp .env.local.template .env.local
  echo "✓ .env.local creado a partir de la plantilla"
  echo "  → Edítalo y reemplaza los valores REPLACE_ME antes de continuar."
else
  echo "✓ .env.local ya existe (no se sobrescribe)"
fi

# 3. Instalar dependencias
echo
echo "▶ Instalando dependencias (npm install)…"
npm install --no-audit --no-fund

# 4. Type-check
echo
echo "▶ Verificación de tipos (tsc --noEmit)…"
npm run type-check

# 5. Resumen
echo
echo "──────────────────────────────────────────────────────"
echo "  Próximos pasos:"
echo "  1. Rellena los valores REPLACE_ME en .env.local"
echo "  2. Ejecuta el SQL de supabase/schema.sql en tu Supabase"
echo "  3. Configura Google OAuth (ver README.md, sección 3.2)"
echo "  4. Arranca el servidor:  npm run dev"
echo "──────────────────────────────────────────────────────"
