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
const usb = require('usb'); // Usar librería nativa usb directly

const app = express();
app.use(cors());
app.use(express.json());

const HTTP_PORT = 3001;

// VID/PID detectados en la ticketera ADV-8011N del usuario
const USB_VID = 1110;
const USB_PID = 2056;

// --- GENERADOR MANUAL DE ESC/POS (MÁS ESTABLE QUE LA LIBRERÍA ALPHA) ---
function manualEscPos(data) {
    const { items, total, title, mesa } = data;
    let chunks = [];

    const add = (buf) => chunks.push(typeof buf === 'string' ? Buffer.from(buf, 'binary') : buf);
    const line = (text = '') => add(text + '\n');
    
    // Comandos ESC/POS Básicos
    const INIT = Buffer.from([0x1B, 0x40]);
    const CENTER = Buffer.from([0x1B, 0x61, 0x01]);
    const LEFT = Buffer.from([0x1B, 0x61, 0x00]);
    const RIGHT = Buffer.from([0x1B, 0x61, 0x02]);
    const BOLD_ON = Buffer.from([0x1B, 0x45, 0x01]);
    const BOLD_OFF = Buffer.from([0x1B, 0x45, 0x00]);
    const SIZE_BIG = Buffer.from([0x1D, 0x21, 0x11]);
    const SIZE_NORMAL = Buffer.from([0x1D, 0x21, 0x00]);
    const CUT = Buffer.from([0x1D, 0x56, 0x41, 0x03]);

    add(INIT);
    add(CENTER);
    add(SIZE_BIG);
    line("RODRIGO'S");
    add(SIZE_NORMAL);
    line("BRASAS & BROASTERS");
    line("--------------------------------");
    
    if (title) {
        add(BOLD_ON);
        line(title.toUpperCase());
        add(BOLD_OFF);
    }
    
    add(LEFT);
    if (mesa) line(`MESA: ${mesa}`);
    line("--------------------------------");

    (items || []).forEach(item => {
        const can = item.cantidad || 0;
        const pre = item.precio || 0;
        const sub = (can * pre).toFixed(2);
        const name = (item.nombre || '').toUpperCase().substring(0, 18);
        line(`${can} ${name.padEnd(18)} S/ ${sub}`);
        
        if (item.detalles) {
            if (item.detalles.parte) line(`   > PRESA: ${item.detalles.parte.toUpperCase()}`);
            if (item.detalles.trozado && item.detalles.trozado !== 'entero') line(`   > ${item.detalles.trozado.toUpperCase()}`);
            if (item.detalles.notas) line(`   > NOTA: ${item.detalles.notas}`);
        }
    });

    line("--------------------------------");
    add(RIGHT);
    add(SIZE_BIG);
    line(`TOTAL: S/ ${Number(total || 0).toFixed(2)}`);
    add(SIZE_NORMAL);
    add(CENTER);
    line("\nGRACIAS POR SU PREFERENCIA");
    line("\n\n\n\n");
    add(CUT);

    return Buffer.concat(chunks);
}

app.post('/print-receipt-usb', (req, res) => {
    let device;
    let iface;
    try {
        console.log("📥 Petición de impresión recibida...");
        device = usb.findByIds(USB_VID, USB_PID);
        if (!device) {
            const devices = usb.getDeviceList();
            device = devices.find(d => d.deviceDescriptor.bDeviceClass === 7);
        }

        if (!device) throw new Error("No se detectó la impresora USB.");

        // Intentar abrir. Si ya está abierta, a veces lanza error o simplemente continua.
        try {
            device.open();
        } catch (e) {
            if (!e.message.includes('already open')) {
                throw e;
            }
        }

        iface = device.interfaces[0];
        
        // Intentar reclamar. Si falla, liberar primero por si acaso quedó bloqueada.
        try {
            iface.claim();
        } catch (e) {
            console.log("⚠️ Reclamando interfaz (segundo intento)...");
            // No hacemos nada, intentamos seguir
        }

        const outEndpoint = iface.endpoints.find(e => e.direction === 'out');
        if (!outEndpoint) throw new Error("No se encontró puerto de salida USB.");

        const finalBuffer = manualEscPos(req.body);
        console.log(`📦 Enviando buffer USB (${finalBuffer.length} bytes)...`);

        outEndpoint.transfer(finalBuffer, (err) => {
            // Liberar SIEMPRE
            try {
                iface.release(true, () => {
                    device.close();
                });
            } catch (closeErr) {
                console.error("Error al cerrar dispositivo:", closeErr.message);
            }

            if (err) {
                console.error("❌ Error en transferencia USB:", err.message);
                return res.status(500).json({ success: false, message: err.message });
            }
            console.log("✅ Ticket impreso con éxito.");
            res.json({ success: true, message: "Ticket impreso" });
        });

    } catch (e) {
        console.error("❌ Error en impresión USB:", e.message);
        
        // Limpieza de emergencia
        try {
            if (iface) iface.release(true, () => {});
            if (device) device.close();
        } catch (err) {}

        res.status(500).json({ success: false, message: e.message });
    }
});

app.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`\n🌎 Servidor local de tickets (USB) activo en puerto ${HTTP_PORT}`);
    console.log(`✅ Todo listo. Ya puede usar el sistema en Chrome.`);
});

// Manejo de errores de conexión
process.on('uncaughtException', (err) => {
    console.error('💥 Error inesperado:', err);
});
