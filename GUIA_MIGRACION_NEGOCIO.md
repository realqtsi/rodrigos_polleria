# 🚀 Guía de Migración - Rodrigo's POS

Esta guía detalla los pasos para trasladar el sistema desde tu laptop personal a la laptop del negocio para que todo funcione excelente desde el primer día.

## 1. Requisitos de Software en la Nueva Laptop
Antes de mover nada, instala esto en la laptop del negocio:
1. **Node.js (LTS):** Descárgalo de [nodejs.org](https://nodejs.org/). Instala la versión **LTS** (Recomendada).
2. **Git (Opcional pero recomendado):** Para poder usar el comando `git pull` que tiene el archivo `.bat`.

## 2. Copia de Archivos (Vía USB - El método rápido)
He creado una herramienta llamada **EMPAQUETAR_PARA_USB.bat** que hace que el proceso sea casi instantáneo:
1. En tu laptop actual, dale doble clic al archivo **EMPAQUETAR_PARA_USB.bat**.
2. Esto creara un archivo llamado `RODRIGOS_POS_MIGRACION.zip` (pesa poquísimo porque no incluye carpetas basura).
3. Copia ese archivo `.zip` a tu USB.
4. En la laptop del negocio, extrae el contenido del `.zip` en una carpeta nueva.
5. **IMPORTANTE:** Asegúrate de que el archivo `.env.local` esté dentro de esa carpeta.

## 2.1 Método Alternativo (Vía GitHub)
Si la laptop del negocio tiene buen internet:
1. Instala Git.
2. Abre una terminal y escribe: `git clone https://github.com/realqtsi/rodrigos_polleria.git`
3. Copia manualmente el archivo `.env.local` desde tu USB a la carpeta del proyecto (este archivo NO se sube a internet por seguridad).

## 3. Instalación de Dependencias
Una vez tengas los archivos en la nueva laptop, abre una terminal en esa carpeta y ejecuta:
```bash
npm install --legacy-peer-deps
```
Esto instalará todo lo necesario, incluyendo el servidor de impresión.

## 4. Configuración de Red (Paso Crítico)
Para que los mozos y las impresoras conecten:
1. **Mismo WiFi:** Todos los dispositivos deben estar en la misma red.
2. **Firewall de Windows:** 
   - Abre el "Panel de Control" > "Sistema y Seguridad" > "Firewall de Windows Defender".
   - Selecciona "Permitir que una aplicación o característica a través de Firewall".
   - Busca **Node.js JavaScript Runtime** y asegúrate de que tenga marcadas las casillas **Privada** y **Pública**.
   - Si no aparece, dale a "Permitir otra aplicación" y busca el ejecutable de Node.

## 5. Configuración de Impresoras
1. Enciende las impresoras en el local.
2. Ejecuta el sistema con el archivo **INICIAR_RODRIGOS.bat**.
3. Entra desde la laptop a `http://localhost:3000`.
4. Ve a **Ajustes > Impresoras** y coloca las IPs que tengan las impresoras en ese nuevo local.

## 6. Uso Diario
Solo usa el archivo **INICIAR_RODRIGOS.bat**. 
- Se abrirán dos ventanas: una para el POS (Sistema) y otra para el Bridge (Impresoras).
- El cuadro azul que sale al principio te dirá la IP para los mozos (ej: `192.168.1.XX`).

---
**¿Algún problema?** Comprueba que la laptop no esté en modo "Red Pública" (Cambia el perfil de red a "Privada" en la configuración de Windows para que sea visible por los celulares).
