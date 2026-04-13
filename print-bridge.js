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
const supabase = createClient(supabaseUrl, supabaseKey);

const PRINTER_IP = '192.168.1.23';
const PRINTER_PORT = 9100;
const USB_VID = 1110;
const USB_PID = 2056;

console.log('🚀 Iniciando Bridge de Impresión Rodrigo\'s...');

// --- GENERADOR MANUAL ESC/POS ULTRA-COMPATIBLE ---
function manualEscPos(data) {
    const { items, total, title, mesa } = data;
    let chunks = [];

    // Usamos ASCII puro para evitar cualquier problema de codificación
    const add = (buf) => chunks.push(typeof buf === 'string' ? Buffer.from(buf, 'ascii') : buf);
    const line = (text = '') => add(text + '\n');
    
    // Comandos ESC/POS Minimalistas (Los mismos de test_usb.js)
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
        // Limpieza de RUC y caracteres no ASCII
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
    line(`TOTAL: S/ ${Number(total || 0).toFixed(2)}`);
    add(CENTER);
    line("\nGRACIAS POR SU PREFERENCIA");
    line("\n\n\n\n");
    add(CUT);

    return Buffer.concat(chunks);
}

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
        try { iface.claim(); } catch (e) { console.log("⚠️ Re-clamando..."); }

        const outEndpoint = iface.endpoints.find(e => e.direction === 'out');
        const finalBuffer = manualEscPos(req.body);
        
        console.log(`📦 Enviando ${finalBuffer.length} bytes a la impresora...`);
        console.log(`📝 Primeros 50 bytes (HEX): ${finalBuffer.slice(0, 50).toString('hex')}`);

        outEndpoint.transfer(finalBuffer, (err) => {
            try { iface.release(true, () => device.close()); } catch (c) {}
            if (err) return res.status(500).json({ success: false, message: err.message });
            console.log("✅ ¡Enviado!");
            res.json({ success: true });
        });
    } catch (e) {
        try { if (iface) iface.release(true, () => {}); if (device) device.close(); } catch (err) {}
        console.error("❌ Error:", e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

// Mantener la parte de Supabase para la cocina
const channel = supabase.channel('nuevas-ventas').on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, payload => {
    // Lógica de cocina omitida aquí para brevedad, pero debe mantenerse en el archivo real
}).subscribe();

app.listen(3001, '0.0.0.0', () => console.log(`🌍 Bridge USB en puerto 3001 activo.`));
