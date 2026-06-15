@echo off
echo Building Lumvale-PDF Core...
cd core
call npm install
call npm run build

echo Starting Lumvale-PDF UI...
cd ../ui
call npm install
call npm run dev
pause
