# 🔐 Guía para Activar HTTPS (Ngrok)

Para que la impresión por **Bluetooth** funcione en los celulares de los mozos, el navegador exige que el sitio sea "Seguro" (HTTPS). Como la laptop está en el local, usaremos **Ngrok** para crear un túnel seguro a internet.

## 1. Instalación (Solo una vez)
1. Ve a [ngrok.com](https://ngrok.com/) y crea una cuenta gratuita.
2. Descarga el archivo ZIP para Windows y extrae el archivo `ngrok.exe` dentro de la carpeta de tu proyecto `rodrigo's`.
3. En tu panel de control de Ngrok, busca tu **Authtoken** y cópialo.
4. Abre una terminal en la carpeta del proyecto y ejecuta:
   ```cmd
   ngrok config add-authtoken TU_TOKEN_AQUI
   ```

## 2. Cómo activarlo diariamente
Cuando vayas a trabajar en modo Bluetooth, haz lo siguiente:
1. Inicia el sistema normalmente con `INICIAR_RODRIGOS.bat`.
2. Abre OTRA terminal y ejecuta:
   ```cmd
   ngrok http 3000
   ```
3. Verás una dirección que dice **Forwarding**, algo como: `https://a1b2-c3d4.ngrok-free.app`.
4. **¡Esa es la dirección que debes pasarle a los mozos!** Al entrar por `https`, el celular les permitirá vincular la impresora Bluetooth.

## 3. Ventaja Extra
Con Ngrok, los mozos podrían incluso tomar pedidos desde su casa si quisieras (aunque lo ideal es que estén en el WiFi local para la impresora). 

> [!IMPORTANT]
> Si decides volver al modo **Ethernet/Red**, no necesitas usar Ngrok; los mozos pueden entrar directamente por la IP de la laptop como antes.
