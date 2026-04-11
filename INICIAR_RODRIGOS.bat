@echo off
setlocal
title RODRIGO'S - Sistema de Gestion y Comandas
color 0E
cls

echo ==========================================================
echo    RODRIGO'S - BRASAS ^& BROASTERS: INICIANDO SISTEMA
echo ==========================================================
echo.

REM Ir a la carpeta del proyecto
cd /d "%~dp0"

echo [1/3] Verificando actualizaciones...
git pull origin main || echo [AVISO] Trabajando en modo offline.

echo.
echo [2/3] Verificando dependencias...
call npm install express cors escpos escpos-network --no-save
call npm install --legacy-peer-deps

echo.
echo [3/3] Configurando red y servidores...
echo.
echo ----------------------------------------------------------
echo   DIRECCION PARA CONECTAR CELULARES (MOZOS):
ipconfig | findstr /i "IPv4"
echo ----------------------------------------------------------
echo.

REM Iniciar el Servidor de Impresion en una ventana separada
echo Iniciando Bridge de Impresion (Puerto 3001)...
start "RODRIGO'S - BRIDGE IMPRESION" cmd /k "color 0B && node print-server.js"

REM Iniciar la aplicacion principal
echo Iniciando Sistema POS (Puerto 3000)...
echo No cierres esta ventana.
echo.
call npm run dev

pause
