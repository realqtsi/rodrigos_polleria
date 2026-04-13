const escpos = require('escpos');
const usb = require('usb');

console.log('🔍 Buscando dispositivos USB...');

try {
    const devices = usb.getDeviceList();
    // Buscar específicamente el dispositivo "Hi Print" (VID 1110, PID 2056) que vimos en Zadig
    const myPrinter = devices.find(d => 
        (d.deviceDescriptor.idVendor === 1110 && d.deviceDescriptor.idProduct === 2056) ||
        d.deviceDescriptor.bDeviceClass === 7
    );

    if (!myPrinter) {
        console.log('❌ No se detectó la impresora Hi Print.');
        console.log('Dispositivos encontrados:', devices.length);
        devices.forEach(d => {
            console.log(`- VID: ${d.deviceDescriptor.idVendor}, PID: ${d.deviceDescriptor.idProduct}`);
        });
        return;
    }

    console.log(`✅ Impresora detectada: VID ${myPrinter.deviceDescriptor.idVendor}, PID ${myPrinter.deviceDescriptor.idProduct}`);

    // Intentar inicializar escpos-usb manualmente con este dispositivo
    escpos.USB = require('escpos-usb');
    
    try {
        console.log('Encendiendo motor de impresión...');
        
        // Pasamos el VID y PID exactos al constructor
        const device = new escpos.USB(myPrinter.deviceDescriptor.idVendor, myPrinter.deviceDescriptor.idProduct);
        const printer = new escpos.Printer(device);

        device.open((err) => {
            if (err) {
                console.error('❌ Error al abrir la impresora:', err.message);
                return;
            }
            console.log('🖨️  Enviando ticket de prueba...');
            printer
                .font('a').align('ct').style('bu').size(1, 1).text('PRUEBA EXITOSA')
                .size(0, 0).text('Rodrigo\'s Pollería').text('--------------------------------')
                .text('Si sale este papel, ya podemos cobrar.')
                .feed(3).cut().close();
            console.log('🚀 ¡Prueba enviada! Debería salir el papel ahora.');
        });
    } catch (e) {
        console.error('❌ Error de librería:', e.message);
        console.log('\nSi el error es "usb.on is not a function", es un problema de versión de Node 24.');
        console.log('Intente ejecutar este comando para arreglarlo:');
        console.log('npm install usb@2.14.0');
    }
} catch (error) {
    console.error('💥 Error:', error);
}
