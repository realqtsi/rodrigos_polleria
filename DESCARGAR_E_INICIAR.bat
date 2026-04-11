@echo off
setlocal
title RODRIGO'S - Instalador Express
color 0E
cls

echo ==========================================================
echo    RODRIGO'S - INSTALADOR EXPRESS (Solo 1 archivo!)
echo ==========================================================
echo.

cd /d "%~dp0"

REM ============================================
REM PASO 1: Verificar/Instalar Node.js
REM ============================================
echo [1/5] Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js no encontrado. Instalando...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi' -OutFile 'node-installer.msi'"
    msiexec /i node-installer.msi /quiet /norestart
    echo Esperando instalacion...
    :WAITNODE
    timeout /t 5 /nobreak >nul
    node --version >nul 2>&1
    if %errorlevel% neq 0 goto WAITNODE
    del node-installer.msi 2>nul
    echo Node.js instalado!
)
echo Node.js:
node --version
echo.

REM ============================================
REM PASO 2: Descargar proyecto desde GitHub
REM ============================================
echo [2/5] Descargando proyecto desde GitHub...
echo.

REM Crear carpeta del proyecto
if not exist "rodrigos" mkdir rodrigos
cd rodrigos

REM Descargar repositorio como ZIP
powershell -Command "Invoke-WebRequest -Uri 'https://github.com/realqtsi/rodrigos_polleria/archive/refs/heads/main.zip' -OutFile 'proyecto.zip'"

if not exist "proyecto.zip" (
    echo [ERROR] No se pudo descargar el proyecto.
    pause
    exit /b 1
)

echo Descomprimiendo...
powershell -Command "Expand-Archive -Force -Path 'proyecto.zip' -DestinationPath '.'"

REM Mover archivos de la carpeta interna
cd rodrigos_polleria-main
move /y * ..\ >nul 2>&1
move /y .* ..\ >nul 2>&1
cd ..
rmdir rodrigos_polleria-main
del proyecto.zip

echo Proyecto descargado!
echo.

REM ============================================
REM PASO 3: Instalar dependencias
REM ============================================
echo [3/5] Instalando dependencias (puede tardar)...
call npm install --legacy-peer-deps
echo npm install express cors escpos escpos-network --no-save
call npm install express cors escpos escpos-network --no-save
echo.

REM ============================================
REM PASO 4: Configurar Firewall
REM ============================================
echo [4/5] Configurando firewall...
netsh advfirewall firewall show rule name="RODRIGOS_PORTS" >nul 2>&1
if %errorlevel% neq 0 (
    netsh advfirewall firewall add rule name="RODRIGOS_PORTS" dir=in action=allow protocol=tcp localport=3000,3001
)
echo.

REM ============================================
REM PASO 5: Mostrar IP y arrancar
REM ============================================
echo [5/5] Informacion de Red
echo.
echo ==========================================================
echo   DIRECCION PARA CELULARES/TABLETS DE MOZOS:
echo ----------------------------------------------------------
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127."') do (
    echo   http://%%a:3000
)
echo ----------------------------------------------------------
echo ==========================================================
echo.
echo Listo! Iniciando servidores...
echo.

REM Bridge de impresion
start "RODRIGO'S - IMPRESION" cmd /k "color 0B && node print-server.js && pause"

timeout /t 2 /nobreak >nul

REM POS principal
echo Iniciando POS...
call npm run dev

pause
