const express = require('express');
const cors = require('cors');
const escpos = require('escpos');
escpos.Network = require('escpos-network');
escpos.USB = require('escpos-usb');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

/**
 * Función genérica para formatear el ticket de venta
 */
function generarTicket(printer, data) {
    const { items, subtotal, total, envio, esDelivery, direccion, title, mesa } = data;

    printer
        .font('a')
        .align('ct')
        .size(2, 2)
        .text("RODRIGO'S")
        .size(1, 1)
        .text("BRASAS & BROASTERS")
        .text("--------------------------------");

    if (title) {
        printer.style('b').text(title).style('n');
    }

    printer.align('lt');

    if (mesa) {
        printer.text(`MESA: ${mesa}`);
    }

    if (esDelivery) {
        printer.text(`ORDEN: DELIVERY`);
        printer.text(`DIR: ${direccion}`);
    }

    printer.text('--------------------------------');

    items.forEach(item => {
        const itemTotal = (item.cantidad * item.precio).toFixed(2);
        // Formato: Cant Nombre Precio
        let nombre = item.nombre.substring(0, 20).padEnd(20);
        printer.text(`${item.cantidad} ${nombre} S/ ${itemTotal}`);
        if (item.detalles && item.detalles.notas) {
            printer.text(`   Nota: ${item.detalles.notas}`);
        }
    });

    printer.text('--------------------------------');

    if (envio > 0) {
        printer.align('rt').text(`SUBTOTAL: S/ ${subtotal.toFixed(2)}`);
        printer.align('rt').text(`ENVIO:    S/ ${envio.toFixed(2)}`);
    }

    printer
        .align('rt')
        .size(2, 2)
        .text(`TOTAL: S/ ${total.toFixed(2)}`)
        .size(1, 1)
        .align('ct')
        .feed(1)
        .text("¡Gracias por su preferencia!")
        .feed(3)
        .cut();
}

/**
 * Endpoint para imprimir en Cocina (Comanda) - Vía RED/IP
 */
app.post('/print-kitchen', (req, res) => {
    const { ip, mesa, items, notas } = req.body;

    if (!ip) return res.status(400).json({ success: false, message: "Falta IP de impresora" });

    const device = new escpos.Network(ip);
    const printer = new escpos.Printer(device);

    device.open((error) => {
        if (error) {
            console.error("Error abriendo impresora cocina:", error);
            return res.status(500).json({ success: false, message: error.message });
        }

        try {
            printer
                .font('a')
                .align('ct')
                .style('bu')
                .size(2, 2)
                .text('COMANDA')
                .size(1, 1)
                .text('--------------------------------')
                .align('lt')
                .text(`MESA: ${mesa}`)
                .text(`FECHA: ${new Date().toLocaleString()}`)
                .text('--------------------------------')
                .style('b')
                .size(1, 1);

            items.forEach(item => {
                printer.text(`${item.cantidad}x ${item.nombre}`);
                if (item.detalles) {
                    if (item.detalles.parte) {
                        printer.text(`   > ${item.detalles.parte}`);
                    }
                    if (item.detalles.trozado) {
                        printer.text(`   > ${item.detalles.trozado}`);
                    }
                    if (item.detalles.notas) {
                        printer.text(`   > NOTA: ${item.detalles.notas}`);
                    }
                }
            });

            if (notas) {
                printer.feed(1).text(`NOTA: ${notas}`);
            }

            printer.feed(3).cut().close();
            res.json({ success: true, message: "Impreso en cocina" });
        } catch (err) {
            console.error("Error imprimiendo:", err);
            res.status(500).json({ success: false, message: err.message });
        }
    });
});

/**
 * Endpoint para imprimir Boleta de Caja - Vía USB (Automático para ADV-8011N)
 */
app.post('/print-receipt-usb', (req, res) => {
    let device;
    try {
        device = new escpos.USB();
    } catch (e) {
        console.error("Error al detectar impresora USB:", e);
        return res.status(500).json({ success: false, message: "No se encontró la impresora USB ADV-8011N." });
    }

    const printer = new escpos.Printer(device);

    device.open((error) => {
        if (error) {
            console.error("Error abriendo puerto USB:", error);
            return res.status(500).json({ success: false, message: "Error al abrir puerto USB: " + error.message });
        }

        try {
            generarTicket(printer, req.body);
            printer.close();
            res.json({ success: true, message: "Ticket impreso en USB" });
        } catch (err) {
            console.error("Error en impresión USB:", err);
            res.status(500).json({ success: false, message: err.message });
        }
    });
});

/**
 * Endpoint para imprimir Boleta de Caja - Vía RED/IP (Legacy)
 */
app.post('/print-receipt', (req, res) => {
    const { ip } = req.body;

    if (!ip) return res.status(400).json({ success: false, message: "Falta IP de impresora" });

    const device = new escpos.Network(ip);
    const printer = new escpos.Printer(device);

    device.open((error) => {
        if (error) {
            console.error("Error abriendo impresora caja IP:", error);
            return res.status(500).json({ success: false, message: error.message });
        }

        try {
            generarTicket(printer, req.body);
            printer.close();
            res.json({ success: true, message: "Ticket impreso en IP" });
        } catch (err) {
            console.error("Error imprimiendo IP:", err);
            res.status(500).json({ success: false, message: err.message });
        }
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Print Server con soporte USB corriendo en puerto ${PORT}`);
    console.log(`- Endpoint Cocina (IP): http://localhost:${PORT}/print-kitchen`);
    console.log(`- Endpoint Caja (USB): http://localhost:${PORT}/print-receipt-usb`);
});
