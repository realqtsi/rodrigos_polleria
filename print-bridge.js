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

// Manejo de errores de conexión
process.on('uncaughtException', (err) => {
    console.error('💥 Error inesperado:', err);
});
