const escpos = require('escpos');
escpos.USB = require('escpos-usb');

console.log('🔍 Buscando ticketeras USB conectadas...');

try {
    const devices = escpos.USB.findPrinter();
    if (devices.length === 0) {
        console.log('❌ No se encontró NINGUNA ticketera USB.');
        console.log('RECOMENDACIÓN:');
        console.log('1. Verifique que la impresora esté encendida y el cable USB conectado.');
        console.log('2. En Zadig, use "List All Devices" y asegúrese de que la impresora use el driver "WinUSB".');
    } else {
        console.log('✅ Ticketeras detectadas:');
        devices.forEach((d, i) => {
            console.log(`${i+1}. Producto: ${d.deviceDescriptor.iProduct || 'Desconocido'} (VID: ${d.deviceDescriptor.idVendor}, PID: ${d.deviceDescriptor.idProduct})`);
        });
        console.log('\nIntentando una prueba de impresión rápida en la primera disponible...');
        
        const device = new escpos.USB(); // Usa la primera detectada
        const printer = new escpos.Printer(device);

        device.open((err) => {
            if (err) {
                console.error('❌ Error al abrir la impresora:', err.message);
                return;
            }
            console.log('🖨️  Imprimiendo ticket de prueba...');
            printer
                .font('a')
                .align('ct')
                .text('PRUEBA DE CONEXIÓN')
                .text('RODRIGO\'S POS')
                .text('--------------------------------')
                .text('Si lees esto, la USB funciona ok.')
                .feed(3)
                .cut()
                .close();
            console.log('🚀 ¡Prueba enviada! Debería salir papel ahora.');
        });
    }
} catch (error) {
    console.error('💥 Error crítico en la detección:', error);
}
