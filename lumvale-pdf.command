#!/bin/bash
cd "$(dirname "$0")"

echo "Installing monorepo dependencies..."
npm install

echo "Building Lumvale-PDF Core..."
npm run build:core

echo "Building Lumvale-PDF UI..."
npm run build:ui

echo "Starting Lumvale-PDF..."
npm run start:ui
