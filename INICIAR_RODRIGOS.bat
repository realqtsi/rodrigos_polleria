@echo off
setlocal enabledelayedexpansion
title MASTER RODRIGO'S - INICIO AUTOMATICO

echo ======================================================
echo    RODRIGO'S - BRASAS ^& BROASTERS (SISTEMA POS)
echo ======================================================
echo.

:: 1. Verificar dependencias (Autoinstalador)
if not exist node_modules (
    echo [1/3] Detectada primera vez: Instalando dependencias...
    call npm install
) else (
    echo [1/3] Configurando entorno...
)
echo.

:: 2. Iniciar Ngrok (Túnel Seguro para Mozo)
if exist ngrok.exe (
    echo [2/3] Iniciando Tunel Seguro para celulares...
    start cmd /k "title NGROK_TUNNEL && .\ngrok http 3000"
) else (
    echo [ERROR] No se encontro ngrok.exe. 
    echo Descargalo y ponlo aqui para que el Bluetooth funcione.
)
echo.

:: 3. Iniciar Servidor Web
echo [3/3] Iniciando Servidor Principal...
start cmd /k "title POS_SERVER && npm run dev"

:: 4. Abrir pagina automaticamente
echo.
echo [FINAL] Abriendo POS en esta laptop...
timeout /t 5 >nul
start http://localhost:3000

echo.
echo ======================================================
echo    ¡SISTEMA LISTO PARA VENDER! 🍗🚀
echo.
echo    IMPORTANTE PARA EL MOZO:
echo    En el celular, usa la direccion que sale en la
echo    ventana de NGROK debajo de "Forwarding".
echo.
echo    Sera algo como: https://xxxx-xxxx.ngrok-free.dev
echo ======================================================
pause
