# Guía de Migración - Rodrigo's POS

## Sistema completo para instalación en laptop del local

---

## 1. REQUISITOS PREVIOS

### Software necesario

| Software | Versión | Descarga |
|----------|---------|----------|
| Node.js | 20.x LTS | https://nodejs.org/ |
| Git | Latest | https://git-scm.com/ |

### Verificar instalación
```bash
node --version    # debe mostrar v20.x.x
npm --version     # debe mostrar 10.x.x
git --version     # debe mostrar 2.x.x
```

---

## 2. ESTRUCTURA DEL PROYECTO

Copia toda la carpeta `rodrigos` del USB a la laptop en:
```
C:\rodrigos\
```

Estructura esperada:
```
C:\rodrigos\
├── src\                    # Código fuente Next.js
├── public\                 # Archivos estáticos
├── node_modules\           # Dependencias (viene incluido)
├── print-server.js         # Servidor de impresión
├── package.json            # Dependencias del proyecto
├── package-lock.json       # Lock de versiones
├── next.config.ts          # Configuración Next.js
├── tsconfig.json           # Configuración TypeScript
├── .env.local              # Variables de entorno
├── INICIAR_RODRIGOS.bat    # Script de inicio rápido
└── sql\                    # Scripts SQL (si necesitas)
```

---

## 3. CONFIGURACIÓN DEL ENTORNO

### 3.1 Variables de entorno (.env.local)

Edita el archivo `.env.local` y configura:

```env
# Supabase - Tu proyecto existente
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui

# Print Server (IP de la laptop del local)
NEXT_PUBLIC_PRINT_SERVER_URL=http://192.168.1.100:3001
```

### 3.2 Obtener las credenciales de Supabase

1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Settings → API
4. Copia `Project URL` y `anon public` key
5. Reemplaza en `.env.local`

---

## 4. INSTALACIÓN DE DEPENDENCIAS

Abre terminal (PowerShell o CMD) en `C:\rodrigos\`:

```bash
# Instalar dependencias del proyecto
npm install

# Instalar dependencias del print-server (si no vinieron)
npm install express cors escpos escpos-network
```

---

## 5. CONFIGURACIÓN DE LA RED

### 5.1 IP estática para la laptop

1. Abre Configuración de Red
2. Conexión Ethernet/WiFi → Propiedades
3. Protocolo de Internet versión 4 (TCP/IPv4)
4. Configurar IP fija:

```
IP: 192.168.1.100
Mascara: 255.255.255.0
Puerta de enlace: 192.168.1.1
DNS: 8.8.8.8
```

### 5.2 Firewall de Windows

Abre PowerShell como **Administrador**:

```powershell
# Permitir Node.js en red privada
netsh advfirewall firewall add rule name="Node.js POS" dir=in action=allow protocol=tcp localport=3000,3001,54321

# O permitir todas las conexiones salientes de node
netsh advfirewall firewall add rule name="Node.js Full" dir=in action=allow program="C:\Program Files\nodejs\node.exe"
```

### 5.3 Verificar conectividad

Desde otra PC en la red, prueba:
```bash
ping 192.168.1.100
```

---

## 6. CONFIGURACIÓN DE IMPRESORAS

### 6.1 Impresoras térmicas compatibles

El sistema usa impresoras ESC/POS genéricas. Ejemplos:
- Epson TM-T88
- Epson TM-T20
- Generic Thermal Printer
- Impresoras POS de 58mm o 80mm

### 6.2 Obtener IP de impresoras

**Opción A: Desde el router**
- Accede a tu router (generalmente 192.168.1.1)
- Revisa dispositivos DHCP o tablas de clientes
- Las impresoras tendrán IPs asignadas

**Opción B: Desde la impresora**
- Imprime un reporte de red (consulta manual de tu impresora)
- Buscar configuración WiFi/Ethernet

**Opción C: Conectar por USB y usar IP local**
- Algunas ticketeras vienen con software para configurar IP

### 6.3 Configurar IPs en el sistema

1. Abre el navegador: `http://localhost:3000`
2. Ve a **Configuración → Negocio**
3. Ingresa las IPs:
   - **IP Impresora Cocina**: `192.168.x.x` (la de cocina)
   - **IP Impresora Caja**: `192.168.x.x` (la del caja)

---

## 7. INICIAR EL SISTEMA

### 7.1 Script automático (recomendado)

Doble clic en `INICIAR_RODRIGOS.bat`

El script hace:
1. Inicia el print-server en puerto 3001
2. Inicia el servidor Next.js en puerto 3000
3. Abre el navegador automáticamente

### 7.2 Inicio manual

Abre 2 terminales:

**Terminal 1 - Print Server:**
```bash
cd C:\rodrigos
node print-server.js
```

**Terminal 2 - Aplicación:**
```bash
cd C:\rodrigos
npm run dev
```

### 7.3 Verificar que funciona

- **Local**: http://localhost:3000
- **Red local**: http://192.168.1.100:3000

---

## 8. ACCESO DESDE TABLETS/OTROS DISPOSITIVOS

### Para los mozos:
```
http://192.168.1.100:3000
```

### Verificar acceso
Desde cualquier dispositivo en la misma red WiFi/router, abre el navegador y prueba la URL.

---

## 9. CHECKLIST FINAL

| Paso | Tarea | Estado |
|------|-------|--------|
| 1 | Instalar Node.js 20.x | ☐ |
| 2 | Copiar carpeta al disco local | ☐ |
| 3 | Configurar .env.local con credenciales Supabase | ☐ |
| 4 | Ejecutar `npm install` | ☐ |
| 5 | Configurar IP estática 192.168.1.100 | ☐ |
| 6 | Abrir puertos en firewall | ☐ |
| 7 | Identificar IPs de impresoras | ☐ |
| 8 | Configurar IPs de impresoras en sistema | ☐ |
| 9 | Probar impresión en cocina | ☐ |
| 10 | Probar impresión de tickets | ☐ |
| 11 | Probar acceso desde tablet/celular | ☐ |

---

## 10. SOLUCIÓN DE PROBLEMAS

### Error: "Cannot connect to printer"
- Verifica que la IP de la impresora sea correcta
- Verifica que la impresora esté encendida y en la misma red
- Prueba hacer ping a la IP de la impresora

### Error: "Supabase connection failed"
- Verifica credenciales en `.env.local`
- Verifica conexión a internet (necesario para Supabase)

### Error: "Port 3000 already in use"
```bash
# Encontrar proceso usando el puerto
netstat -ano | findstr :3000

# Matar proceso (reemplaza PID)
taskkill /PID <número> /F
```

### Print server no responde
```bash
# Verificar que está corriendo
curl http://localhost:3001/health
```

### No carga el sistema
```bash
# Limpiar cache y reinstalar
rmdir /s /q node_modules
npm install
npm run dev
```

---

## 11. MANTENIMIENTO

### Respaldos
- El sistema usa Supabase Cloud (respaldos automáticos)
- Backup local recomendado: copiar carpeta periódicamente

### Actualizaciones
```bash
cd C:\rodrigos
git pull  # si usas git
npm install
npm run build
```

### Reiniciar servicios
```bash
# Detener con Ctrl+C en cada terminal
# Volver a iniciar con los comandos del paso 7.2
```

---

## 12. CONTACTO DE SOPORTE

Para soporte técnico, contacta al desarrollador.
