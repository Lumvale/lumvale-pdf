#!/bin/bash
cd "$(dirname "$0")"
echo "Building Lumvale-PDF Core..."
cd core
npm install
npm run build

echo "Starting Lumvale-PDF UI..."
cd ../ui
npm install
npm run dev
