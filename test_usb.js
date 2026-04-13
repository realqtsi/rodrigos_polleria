const usb = require('usb');

console.log('🔍 Iniciando Detección Manual (Evitando escpos-usb)...');

try {
    const devices = usb.getDeviceList();
    // VID: 1110 (0x0456), PID: 2056 (0x0808)
    const myPrinter = devices.find(d => 
        (d.deviceDescriptor.idVendor === 1110 && d.deviceDescriptor.idProduct === 2056)
    );

    if (!myPrinter) {
        console.log('❌ No se detectó la impresora Hi Print (0456:0808).');
        return;
    }

    console.log(`✅ Impresora encontrada. Intentando reclamar el dispositivo...`);

    myPrinter.open();
    
    // Las impresoras térmicas suelen tener la interface 0
    const iface = myPrinter.interfaces[0];
    
    // Si Windows tiene el driver enganchado, esto fallará. 
    // Por eso usamos WinUSB/Zadig.
    iface.claim();
    
    // Buscamos el endpoint de SALIDA (Out) para enviar datos
    const outEndpoint = iface.endpoints.find(e => e.direction === 'out');

    if (!outEndpoint) {
        console.log('❌ No se encontró el puerto de salida (Out Endpoint).');
        return;
    }

    console.log('🚀 Enviando comandos ESC/POS puros...');

    // Buffer con comandos ESC/POS: Inicializar, Texto, Corte
    const data = Buffer.concat([
        Buffer.from([0x1B, 0x40]), // ESC @ (Inicializar)
        Buffer.from('--------------------------------\n'),
        Buffer.from('        PRUEBA DIRECTA USB      \n'),
        Buffer.from('       RODRIGO\'S POLLERIA      \n'),
        Buffer.from('--------------------------------\n'),
        Buffer.from('Si sale este papel, lo logramos.\n'),
        Buffer.from('\n\n\n'),
        Buffer.from([0x1D, 0x56, 0x41, 0x03]) // GS V A (Corte parcial)
    ]);

    outEndpoint.transfer(data, (err) => {
        if (err) {
            console.error('❌ Error al transferir datos:', err.message);
        } else {
            console.log('🎉 ¡EXITO! El papel debería estar saliendo.');
        }
        
        // Limpiamos y cerramos
        iface.release(true, (err) => {
            myPrinter.close();
            console.log('🔌 Conexión cerrada.');
        });
    });

} catch (error) {
    console.error('💥 Error:', error.message);
    if (error.message.includes('libusb')) {
        console.log('Sugerencia: Reinstale el driver WinUSB en Zadig para este dispositivo.');
    }
}
