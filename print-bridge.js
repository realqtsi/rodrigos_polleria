const { createClient } = require('@supabase/supabase-js');
const escpos = require('escpos');
escpos.Network = require('escpos-network');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Faltan variables de entorno en .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// CONFIGURACIÓN DE IMPRESORA (IP proporcionada por el usuario)
const PRINTER_IP = '192.168.1.23';
const PRINTER_PORT = 9100;

console.log('🚀 Iniciando Bridge de Impresión Rodrigo\'s...');
console.log(`📡 Escuchando pedidos de Supabase...`);
console.log(`🖨️  Impresora configurada en: ${PRINTER_IP}:${PRINTER_PORT}`);

// Función para imprimir una comanda
async function imprimirComanda(venta) {
    console.log(`\n📄 Procesando pedido #${venta.id.substring(0, 8)}...`);

    const device = new escpos.Network(PRINTER_IP, PRINTER_PORT);
    const printer = new escpos.Printer(device);

    device.open(function (error) {
        if (error) {
            console.error('❌ Error al conectar con la impresora:', error);
            return;
        }

        try {
            printer
                .font('a')
                .align('ct')
                .style('bu')
                .size(1, 1)
                .text('COMANDA DE COCINA')
                .size(0, 0)
                .text('--------------------------------')
                .align('lt')
                .text(`MESA: ${venta.mesa_id ? 'Mesa ' + venta.mesa_id : 'PARA LLEVAR'}`)
                .text(`FECHA: ${new Date(venta.created_at).toLocaleString()}`)
                .text('--------------------------------')
                .style('b');

            // Listar items
            venta.items.forEach(item => {
                printer.text(`${item.cantidad}x ${item.nombre}`);
                if (item.detalles?.notas) {
                    printer.text(`   NOTA: ${item.detalles.notas}`);
                }
            });

            printer
                .text('--------------------------------')
                .feed(3)
                .cut()
                .close();

            console.log('✅ Impresión enviada con éxito.');
        } catch (err) {
            console.error('❌ Error durante la impresión:', err);
            device.close();
        }
    });
}

// Escuchar cambios en tiempo real (CUALQUIER cambio en la tabla ventas)
const channel = supabase
    .channel('nuevas-ventas')
    .on('postgres_changes',
        { event: '*', schema: 'public', table: 'ventas' },
        payload => {
            console.log(`\n🔔 Evento recibido: [${payload.eventType}]`);
            const venta = payload.new || payload.old;

            if (payload.eventType === 'INSERT') {
                console.log('✨ Nuevo pedido detectado. Iniciando impresión...');
                imprimirComanda(venta);
            } else if (payload.eventType === 'UPDATE') {
                const oldVenta = payload.old;
                const newVenta = payload.new;

                // Solo imprimimos si NO es un cambio de pago (de pendiente a pagado)
                // y si el estado actual no es pagado
                if (newVenta.estado_pago === 'pagado') {
                    console.log('💰 Pago detectado o pedido ya pagado. Saltando impresión de comanda.');
                    return;
                }

                console.log('🔄 Pedido actualizado. Re-enviando comanda a cocina...');
                imprimirComanda(newVenta);
            }
        }
    )
    .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
            console.log('✅ Conectado a Supabase Realtime.');
            console.log('📡 Esperando INSERT o UPDATE en la tabla "ventas"...');
        }
        if (err) {
            console.error('❌ Error de suscripción:', err);
        }
    });

// --- INTEGRACIÓN DE SERVIDOR EXPRESS PARA IMPRESIÓN USB DESDE EL NAVEGADOR ---
const express = require('express');
const cors = require('cors');
escpos.USB = require('escpos-usb');

const app = express();
app.use(cors());
app.use(express.json());

const HTTP_PORT = 3001;

function generarTicketVenta(printer, data) {
    const { items, total, title, mesa } = data;
    printer
        .font('a').align('ct').size(2, 2).text("RODRIGO'S")
        .size(1, 1).text("BRASAS & BROASTERS").text("--------------------------------");
    if (title) printer.style('b').text(title).style('n');
    printer.align('lt');
    if (mesa) printer.text(`MESA: ${mesa}`);
    printer.text('--------------------------------');
    items.forEach(item => {
        const itemTotal = (item.cantidad * item.precio).toFixed(2);
        let nombre = item.nombre.substring(0, 20).padEnd(20);
        printer.text(`${item.cantidad} ${nombre} S/ ${itemTotal}`);
        if (item.detalles?.notas) printer.text(`   Nota: ${item.detalles.notas}`);
    });
    printer.text('--------------------------------')
        .align('rt').size(2, 2).text(`TOTAL: S/ ${total.toFixed(2)}`)
        .size(1, 1).align('ct').feed(1).text("¡Gracias por su preferencia!")
        .feed(3).cut();
}

app.post('/print-receipt-usb', (req, res) => {
    let device;
    try {
        device = new escpos.USB();
    } catch (e) {
        return res.status(500).json({ success: false, message: "No se detectó la impresora USB ADV-8011N." });
    }
    const printer = new escpos.Printer(device);
    device.open((error) => {
        if (error) return res.status(500).json({ success: false, message: error.message });
        try {
            generarTicketVenta(printer, req.body);
            printer.close();
            res.json({ success: true, message: "Ticket impreso en USB" });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
});

app.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`\n🌎 Servidor local de tickets (USB) activo en puerto ${HTTP_PORT}`);
    console.log(`✅ Todo listo. Ya puede usar el sistema en Chrome.`);
});

// Manejo de errores de conexión
process.on('uncaughtException', (err) => {
    console.error('💥 Error inesperado:', err);
});
