const escpos = require('escpos');
escpos.USB = require('escpos-usb');

try {
    const devices = escpos.USB.findPrinter();
    console.log('--- Impresoras USB detectadas ---');
    console.log(JSON.stringify(devices, null, 2));
} catch (error) {
    console.error('Error al buscar impresoras USB:', error);
}
