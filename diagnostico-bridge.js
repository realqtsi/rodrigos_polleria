const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConfig() {
    console.log('--- DIAGNÓSTICO DE CONFIGURACIÓN ---');

    // 1. Verificar modo_impresion
    const { data: config, error: configError } = await supabase
        .from('configuracion_negocio')
        .select('*')
        .eq('id', 1)
        .single();

    if (configError) {
        console.error('❌ Error al obtener configuración:', configError.message);
    } else {
        console.log('✅ Modo de impresión actual:', config.modo_impresion);
        if (config.modo_impresion !== 'bridge') {
            console.log('⚠️ ADVERTENCIA: El modo de impresión NO es "bridge". Está en:', config.modo_impresion);
            console.log('   Para que el bridge funcione, debe estar en "bridge".');
        }
    }

    // 2. Verificar si hay ventas recientes
    const { data: ventas, error: ventasError } = await supabase
        .from('ventas')
        .select('id, created_at, mesa_id')
        .order('created_at', { ascending: false })
        .limit(3);

    if (ventasError) {
        console.error('❌ Error al obtener ventas:', ventasError.message);
    } else {
        console.log(`✅ Se encontraron ${ventas.length} ventas recientes.`);
        ventas.forEach(v => console.log(`   - Venta ID: ${v.id.substring(0, 8)}... Fecha: ${v.created_at} Mesa: ${v.mesa_id}`));
    }

    console.log('\n--- PRUEBA DE REALTIME ---');
    console.log('Escuchando CUALQUIER cambio en la base de datos por 30 segundos...');

    const channel = supabase
        .channel('debug-all-changes')
        .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
            console.log('🔔 ¡EVENTO DETECTADO!', payload.table, payload.eventType);
        })
        .subscribe((status) => {
            console.log('📡 Estado de suscripción:', status);
            if (status === 'SUBSCRIBED') {
                console.log('✅ Suscripción exitosa. Intenta hacer un pedido ahora en el POS.');
            }
        });

    setTimeout(() => {
        console.log('\nTerminando prueba de diagnóstico.');
        process.exit(0);
    }, 30000);
}

checkConfig();
