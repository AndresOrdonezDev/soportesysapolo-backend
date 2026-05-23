#!/bin/sh
set -e

echo "▶ Ejecutando seed..."
node dist/seed/seed.js

echo "▶ Iniciando backend..."
exec node dist/main
