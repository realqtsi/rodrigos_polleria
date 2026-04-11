@echo off
setlocal EnableDelayedExpansion
title RODRIGO'S - Instalador Completo
color 0E
cls

echo.
echo  ███████╗████████╗ █████╗ ██████╗  ██████╗ ███████╗██████╗ ███████╗
echo  ██╔════╝╚══██╔══╝██╔══██╗██╔══██╗██╔═══██╗██╔════╝██╔══██╗██╔════╝
echo  ███████╗   ██║   ███████║██████╔╝██║   ██║█████╗  ██████╔╝███████╗
echo  ╚════██║   ██║   ██╔══██║██╔═══╝ ██║   ██║██╔══╝  ██╔══██╗╚════██║
echo  ███████║   ██║   ██║  ██║██║     ╚██████╔╝███████╗██║  ██║███████║
echo  ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝      ╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝
echo.
echo  POLLERIA - INSTALADOR EXPRESS
echo.

cd /d "%~dp0"

REM ============================================
REM PASO 1: Verificar/Instalar Node.js
REM ============================================
echo [1/6] Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo   Node.js no encontrado. Instalando...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi' -OutFile 'node-installer.msi'"
    msiexec /i node-installer.msi /quiet /norestart
    echo   Esperando instalacion de Node.js...
    :WAITNODE
    timeout /t 5 /nobreak >nul
    node --version >nul 2>&1
    if %errorlevel% neq 0 goto WAITNODE
    del node-installer.msi 2>nul
    echo   Node.js instalado!
)
echo   Node.js: 
node --version
echo.

REM ============================================
REM PASO 2: Verificar/Instalar Git
REM ============================================
echo [2/6] Verificando Git...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo   Git no encontrado. Instalando...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/git-for-windows/git/releases/download/v2.45.1.windows.1/MinGit-2.45.1-64-bit.zip' -OutFile 'git.zip'"
    powershell -Command "Expand-Archive -Force -Path 'git.zip' -DestinationPath 'C:\Git'"
    set PATH=%PATH%;C:\Git\cmd;C:\Git\bin
    del git.zip 2>nul
    echo   Git instalado!
) else (
    echo   Git ya instalado!
)
git --version
echo.

REM ============================================
REM PASO 3: Clonar proyecto
REM ============================================
echo [3/6] Descargando proyecto desde GitHub...
echo.

set REPO_URL=https://github.com/realqtsi/rodrigos_polleria.git

if exist "rodrigos" (
    echo   Carpeta existente detectada. Actualizando...
    cd rodrigos
    git pull origin main
    if !errorlevel! neq 0 (
        echo   Error al actualizar. Intentando clonar de nuevo...
        cd ..
        rmdir /s /q rodrigos
        git clone !REPO_URL! rodrigos
    )
    cd ..
) else (
    echo   Clonando repositorio por primera vez...
    git clone !REPO_URL! rodrigos
    if !errorlevel! neq 0 (
        echo.
        echo   [ERROR] No se pudo clonar el repositorio.
        echo   Verifica tu conexion a internet.
        pause
        exit /b 1
    )
)
echo   Proyecto descargado!
echo.

REM ============================================
REM PASO 4: Instalar dependencias
REM ============================================
echo [4/6] Instalando dependencias...
echo   Esto puede tardar varios minutos...
echo.

cd rodrigos
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo.
    echo   [ADVERTENCIA] Intentando con cache limpio...
    npm cache clean --force
    call npm install --legacy-peer-deps
)
echo.

REM ============================================
REM PASO 5: Configurar Firewall
REM ============================================
echo [5/6] Configurando firewall...
netsh advfirewall firewall show rule name="RODRIGOS_PORTS" >nul 2>&1
if %errorlevel% neq 0 (
    netsh advfirewall firewall add rule name="RODRIGOS_PORTS" dir=in action=allow protocol=tcp localport=3000,3001 >nul 2>&1
    echo   Reglas de firewall creadas.
) else (
    echo   Firewall ya configurado.
)
echo.

REM ============================================
REM PASO 6: Mostrar info e iniciar
REM ============================================
echo [6/6] Iniciando servidores...
echo.
echo ============================================================
echo.
echo   LISTO! DIRECCIONES DE ACCESO:
echo   ----------------------------------------------------------
echo.

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127."') do (
    echo   POS:        http://%%a:3000
    echo   Print Srv:  http://%%a:3001
    set LOCAL_IP=%%a
)

echo.
echo   Para tablets/moviles de mozos:
echo   http://!LOCAL_IP!:3000
echo.
echo ============================================================
echo.
echo   IMPORTANTE: Manten esta ventana ABIERTA
echo   Cierra con Ctrl+C o cierra la ventana
echo.

timeout /t 2 /nobreak >nul

REM Verificar .env.local
if not exist ".env.local" (
    echo.
    echo   [ADVERTENCIA] No se encontro .env.local
    echo   El sistema puede no funcionar correctamente.
    echo.
)

REM Servidor de impresion
start "RODRIGO'S - IMPRESORA" cmd /k "cd rodrigos && node print-server.js"

timeout /t 1 /nobreak >nul

REM POS principal
cd rodrigos
call npm run dev

echo.
echo El servidor se cerrara en 5 segundos...
timeout /t 5 /nobreak >nul
