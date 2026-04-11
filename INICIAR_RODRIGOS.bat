@echo off
setlocal
title RODRIGO'S - Sistema de Gestion y Comandas
color 0E
cls

echo ==========================================================
echo    RODRIGO'S - BRASAS & BROASTERS: INSTALADOR
echo ==========================================================
echo.

cd /d "%~dp0"

REM ============================================
REM PASO 1: Verificar e instalar Node.js
REM ============================================
echo [1/6] Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js no encontrado. Instalando...
    echo.
    echo Descargando Node.js 20 LTS...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi' -OutFile 'node-installer.msi'"
    echo.
    echo Instalando Node.js (esto puede tomar unos minutos)...
    msiexec /i node-installer.msi /quiet /norestart
    echo Esperando instalacion de Node.js...
    :WAITNODE
    timeout /t 5 >nul
    node --version >nul 2>&1
    if %errorlevel% neq 0 goto WAITNODE
    del node-installer.msi
    echo Node.js instalado correctamente!
) else (
    echo Node.js encontrado:
    node --version
)
echo.

REM ============================================
REM PASO 2: Git pull (actualizar codigo)
REM ============================================
echo [2/6] Verificando actualizaciones...
git pull origin main 2>nul
if %errorlevel% neq 0 (
    echo [AVISO] Trabajando en modo offline o sin repo Git.
)
echo.

REM ============================================
REM PASO 3: Instalar dependencias
REM ============================================
echo [3/6] Instalando dependencias del proyecto...
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo [ERROR] Fallo al instalar dependencias.
    pause
    exit /b 1
)
echo.

echo [4/6] Instalando dependencias del Print Server...
call npm install express cors escpos escpos-network --no-save
echo.

REM ============================================
REM PASO 4: Configurar firewall
REM ============================================
echo [5/6] Configurando firewall de Windows...
echo.

REM Verificar si las reglas ya existen
netsh advfirewall firewall show rule name="RODRIGOS_PORTS" >nul 2>&1
if %errorlevel% neq 0 (
    echo   - Abriendo puerto 3000 (Sistema POS)...
    netsh advfirewall firewall add rule name="RODRIGOS_PORTS" dir=in action=allow protocol=tcp localport=3000,3001
    echo   - Reglas de firewall configuradas.
) else (
    echo   - Reglas de firewall ya existentes.
)
echo.

REM ============================================
REM PASO 5: Mostrar informacion de red
REM ============================================
echo [6/6] Configuracion de Red
echo.
echo ==========================================================
echo   DIRECCION IP DEL SERVIDOR (para celulares/tablets):
echo ----------------------------------------------------------
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127."') do (
    echo   http://%%a:3000
)
echo ----------------------------------------------------------
echo   Para conectar: abre esta direccion en el navegador
echo   del celular o tablet de los mozos.
echo ==========================================================
echo.
echo NOTA: Solo dispositivos en la misma red WiFi/router.
echo.

REM ============================================
REM PASO 6: Iniciar servidores
REM ============================================
echo Iniciando servidores...
echo.

REM Iniciar el Servidor de Impresion en ventana separada
start "RODRIGO'S - BRIDGE IMPRESION" cmd /k "color 0B && title BRIDGE IMPRESION - Puerto 3001 && node print-server.js && pause"

timeout /t 2 >nul

REM Iniciar la aplicacion principal
echo Iniciando Sistema POS (Puerto 3000)...
echo No cierres esta ventana.
echo.
call npm run dev

pause
