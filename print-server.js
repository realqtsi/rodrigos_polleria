const express = require('express');
const cors = require('cors');
const escpos = require('escpos');
escpos.Network = require('escpos-network');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

/**
 * Endpoint para imprimir en Cocina (Comanda)
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
                if (item.detalles?.notas) {
                    printer.text(`   => ${item.detalles.notas}`);
                }
            });

            if (notas) {
                printer.feed(1).text(`NOTA: ${notas}`);
            }

            printer
                .feed(3)
                .cut()
                .close();

            res.json({ success: true, message: "Impreso en cocina" });
        } catch (err) {
            console.error("Error imprimiendo:", err);
            res.status(500).json({ success: false, message: err.message });
        }
    });
});

/**
 * Endpoint para imprimir Boleta de Caja
 */
app.post('/print-receipt', (req, res) => {
    const { ip, items, subtotal, total, envio, esDelivery, direccion } = req.body;

    if (!ip) return res.status(400).json({ success: false, message: "Falta IP de impresora" });

    const device = new escpos.Network(ip);
    const printer = new escpos.Printer(device);

    device.open((error) => {
        if (error) {
            console.error("Error abriendo impresora caja:", error);
            return res.status(500).json({ success: false, message: error.message });
        }

        try {
            printer
                .font('a')
                .align('ct')
                .size(2, 2)
                .text("RODRIGO'S")
                .size(1, 1)
                .text("BRASAS & BROASTERS")
                .text("--------------------------------")
                .align('lt');

            if (esDelivery) {
                printer.text(`ORDEN: DELIVERY`);
                printer.text(`DIR: ${direccion}`);
            }

            printer.text('--------------------------------');

            items.forEach(item => {
                const itemTotal = (item.cantidad * item.precio).toFixed(2);
                printer.text(`${item.cantidad} ${item.nombre.padEnd(20)} S/ ${itemTotal}`);
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
                .cut()
                .close();

            res.json({ success: true, message: "Ticket impreso" });
        } catch (err) {
            console.error("Error imprimiendo:", err);
            res.status(500).json({ success: false, message: err.message });
        }
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Print Bridge corriendo en puerto ${PORT}`);
    console.log(`Accesible en la red local para los mozos.`);
});
