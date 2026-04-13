@echo off
TITLE Rodrigo's Print Bridge
cd /d "%~dp0"
echo ==========================================
echo    RODRIGO'S ETHERNET PRINT BRIDGE
echo ==========================================
echo.
echo 1. Instalando dependencias (solo la primera vez)...
call npm install @supabase/supabase-js escpos escpos-network escpos-usb dotenv express cors
echo.
echo 2. Iniciando servicio de impresion...
node print-bridge.js
pause
