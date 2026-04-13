const escpos = require('escpos');
// No usaremos escpos.USB directamente si falla el constructor
const usb = require('usb');

console.log('🔍 Buscando dispositivos USB...');

try {
    const devices = usb.getDeviceList();
    const printers = devices.filter(d => {
        try {
            return d.deviceDescriptor.bDeviceClass === 0 || d.deviceDescriptor.bDeviceClass === 7;
        } catch (e) { return false; }
    });

    if (printers.length === 0) {
        console.log('❌ No se detectó ninguna impresora USB compatible.');
    } else {
        console.log(`✅ Se encontraron ${printers.length} dispositivos USB.`);
        
        // Intentar usar escpos-usb pero con un fix manual si es necesario
        escpos.USB = require('escpos-usb');
        
        try {
            const device = new escpos.USB(); 
            const printer = new escpos.Printer(device);

            device.open((err) => {
                if (err) {
                    console.error('❌ Error al abrir la impresora:', err.message);
                    console.log('Sugerencia: Use Zadig para cambiar el driver a WinUSB.');
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
                console.log('🚀 ¡Prueba enviada!');
            });
        } catch (e) {
            console.error('❌ El driver de la impresora tiene un conflicto con Node.js:', e.message);
            console.log('\n--- SOLUCIÓN PASO A PASO ---');
            console.log('1. Abra Zadig.');
            console.log('2. Options -> List All Devices.');
            console.log('3. Seleccione su impresora USB.');
            console.log('4. Cambie el driver actual por "WinUSB".');
            console.log('5. Dele a "Replace Driver" o "Reinstall Driver".');
            console.log('6. Reinicie esta prueba.');
        }
    }
} catch (error) {
    console.error('💥 Error:', error);
}
