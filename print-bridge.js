const { createClient } = require('@supabase/supabase-js');
const escpos = require('escpos');
escpos.Network = require('escpos-network');
const dotenv = require('dotenv');
const path = require('path');
const express = require('express');
const cors = require('cors');
const usb = require('usb'); 

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Faltan variables de entorno en .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// CONFIGURACIÓN DE IMPRESORA COCINA (IP)
const PRINTER_IP = '192.168.1.23';
const PRINTER_PORT = 9100;

// CONFIGURACIÓN DE IMPRESORA CAJA (USB)
const USB_VID = 1110;
const USB_PID = 2056;

// --- FUNCION PARA IMPRIMIR COMANDA (COCINA - IP) ---
async function imprimirComanda(venta) {
    console.log(`\n📄 Procesando pedido #${venta.id.substring(0, 8)} para COCINA...`);
    const device = new escpos.Network(PRINTER_IP, PRINTER_PORT);
    const printer = new escpos.Printer(device);

    device.open(function (error) {
        if (error) {
            console.error('❌ Error conexión cocina:', error.message);
            return;
        }
        try {
            printer
                .font('a').align('ct').style('bu').size(1, 1).text('COMANDA DE COCINA').size(0, 0)
                .text('--------------------------------').align('lt')
                .text(`MESA: ${venta.mesa_id ? 'Mesa ' + venta.mesa_id : 'PARA LLEVAR'}`)
                .text(`FECHA: ${new Date(venta.created_at).toLocaleString()}`)
                .text('--------------------------------').style('b');

            venta.items.forEach(item => {
                printer.text(`${item.cantidad}x ${item.nombre}`);
                if (item.detalles?.notas) printer.text(`   NOTA: ${item.detalles.notas}`);
            });

            printer.text('--------------------------------').feed(3).cut().close();
            console.log('✅ Comanda enviada a cocina.');
        } catch (err) {
            console.error('❌ Error impresión cocina:', err);
            device.close();
        }
    });
}

// --- GENERADOR MANUAL ESC/POS ULTRA-COMPATIBLE PARA USB ---
function manualEscPos(data) {
    const { items, total, title, mesa } = data;
    let chunks = [];

    // Usamos ASCII puro para evitar cualquier problema de codificación en el cabezal térmico
    const add = (buf) => chunks.push(typeof buf === 'string' ? Buffer.from(buf, 'ascii') : buf);
    const line = (text = '') => add(text + '\n');
    
    const INIT = Buffer.from([0x1B, 0x40]);
    const CENTER = Buffer.from([0x1B, 0x61, 0x01]);
    const LEFT = Buffer.from([0x1B, 0x61, 0x00]);
    const RIGHT = Buffer.from([0x1B, 0x61, 0x02]);
    const CUT = Buffer.from([0x1D, 0x56, 0x41, 0x03]);

    add(INIT);
    add(CENTER);
    line("RODRIGO'S BRASAS & BROASTERS");
    line("--------------------------------");
    
    if (title) {
        // Limpieza total: borra RUC y quita tildes/eñes para no confundir a la impresora
        const cleanTitle = title.replace(/RUC:?\s?\d+/gi, '').replace(/[^\x00-\x7F]/g, "").trim();
        line(cleanTitle.toUpperCase());
    }
    
    add(LEFT);
    if (mesa) line(`MESA: ${mesa}`);
    line("--------------------------------");

    (items || []).forEach(item => {
        const can = item.cantidad || 0;
        const pre = item.precio || 0;
        const sub = (can * pre).toFixed(2);
        const name = (item.nombre || '').replace(/[^\x00-\x7F]/g, "").toUpperCase().substring(0, 18);
        line(`${can} ${name.padEnd(18)} S/ ${sub}`);
        
        if (item.detalles) {
            if (item.detalles.parte) line(`   > PRESA: ${item.detalles.parte.toUpperCase()}`);
            if (item.detalles.trozado && item.detalles.trozado !== 'entero') line(`   > ${item.detalles.trozado.toUpperCase()}`);
            if (item.detalles.notas) line(`   > NOTA: ${item.detalles.notas.replace(/[^\x00-\x7F]/g, "")}`);
        }
    });

    line("--------------------------------");
    add(RIGHT);
    const envio = Number(data.envio || 0);
    if (envio > 0) {
        line(`SUBTOTAL: S/ ${(Number(total) - envio).toFixed(2)}`);
        line(`ENVIO:    S/ ${envio.toFixed(2)}`);
    }
    line(`TOTAL:    S/ ${Number(total || 0).toFixed(2)}`);
    add(CENTER);
    line("\nGRACIAS POR SU PREFERENCIA");
    line("\n\n\n\n");
    add(CUT);

    return Buffer.concat(chunks);
}

// --- SERVIDOR EXPRESS PARA RECIBOS USB ---
const app = express();
app.use(cors());
app.use(express.json());

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

        try { device.open(); } catch (e) { if (!e.message.includes('already open')) throw e; }

        iface = device.interfaces[0];
        try { iface.claim(); } catch (e) {}

        const outEndpoint = iface.endpoints.find(e => e.direction === 'out');
        const finalBuffer = manualEscPos(req.body);
        
        console.log(`📦 Enviando ${finalBuffer.length} bytes a la impresora USB...`);

        outEndpoint.transfer(finalBuffer, (err) => {
            try { iface.release(true, () => device.close()); } catch (c) {}
            if (err) return res.status(500).json({ success: false, message: err.message });
            console.log("✅ Ticket enviado.");
            res.json({ success: true });
        });
    } catch (e) {
        try { if (iface) iface.release(true, () => {}); if (device) device.close(); } catch (err) {}
        console.error("❌ Error USB:", e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

// ESCUCHAR SUPABASE (Para Cocina)
supabase.channel('nuevas-ventas').on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, payload => {
    const venta = payload.new || payload.old;
    if (payload.eventType === 'INSERT') {
        imprimirComanda(venta);
    } else if (payload.eventType === 'UPDATE' && payload.new.estado_pago !== 'pagado') {
        imprimirComanda(payload.new);
    }
}).subscribe();

app.listen(3001, '0.0.0.0', () => {
    console.log(`\n🌍 Bridge RO RODRIGO Activo en puerto 3001`);
    console.log(`✅ Cocina (IP): ${PRINTER_IP}`);
    console.log(`✅ Caja (USB): Detectando Hi Print...`);
});
