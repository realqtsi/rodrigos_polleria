const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const CATEGORIA_BEBIDAS_ID = 'fe4fd5ae-c14e-4ef4-95c1-73cb72ac80bf';

const coreBrands = ['inca_kola', 'coca_cola', 'fanta', 'sprite', 'agua_mineral'];

async function run() {
    console.log('--- Starting Beverage Initialization ---');

    // 1. Define Pricing Rules
    const priceRules = {
        'descartable': 4,
        'personal': 4,
        'litro': 7,
        'litro_medio': 9,
        'gordita': 5,
        'personal_retornable': 3,
        'un_litro': 6, // for Frugos
        'litro_medio_frugos': 8,
        'queirolo': 25,
        'estancia': 45
    };

    // 2. Add Frugos and Vino to Catalog
    const extraBeverages = [
        {
            nombre: 'Frugos',
            slug: 'frugos',
            dot_color: 'bg-orange-500',
            formatos: [
                { key: 'un_litro', label: '1L', desc: 'Frugos 1 Litro', precio: 6 },
                { key: 'litro_medio', label: '1.5L', desc: 'Frugos 1.5 Litros', precio: 8 }
            ]
        },
        {
            nombre: 'Vino',
            slug: 'vino',
            dot_color: 'bg-red-800',
            formatos: [
                { key: 'queirolo', label: 'Queirolo', desc: 'Vino Queirolo', precio: 25 },
                { key: 'estancia', label: 'Estancia', desc: 'Vino Estancia', precio: 45 }
            ]
        }
    ];

    for (const bev of extraBeverages) {
        console.log(`Adding to catalog: ${bev.nombre}`);
        await supabase.from('catalogo_bebidas').upsert(bev, { onConflict: 'slug' });
    }

    // 3. Sync CORE and EXTRA products
    // We need to make sure core brands products exist with matching keys
    // For now I'll just update prices for all products that match brand/type keys
    
    console.log('Syncing product entries...');
    // We'll iterate over core brands (hardcoded in hook) and extra (in DB)
    const allCatalogs = [
        { nombre: 'Inca Kola', slug: 'inca_kola', formatos: [
            { key: 'personal_retornable', label: 'Personal Ret.', precio: 3 },
            { key: 'descartable', label: 'Descartable', precio: 4 },
            { key: 'gordita', label: 'Gordita', precio: 5 },
            { key: 'litro', label: '1L', precio: 7 },
            { key: 'litro_medio', label: '1.5L', precio: 9 }
        ]},
        { nombre: 'Coca Cola', slug: 'coca_cola', formatos: [
            { key: 'personal_retornable', label: 'Personal Ret.', precio: 3 },
            { key: 'descartable', label: 'Descartable', precio: 4 },
            { key: 'gordita', label: 'Gordita', precio: 5 },
            { key: 'litro', label: '1L', precio: 7 },
            { key: 'litro_medio', label: '1.5L', precio: 9 }
        ]},
        ...extraBeverages
    ];

    for (const cat of allCatalogs) {
        for (const f of cat.formatos) {
            const nombre = `${cat.nombre} ${f.label}`;
            console.log(`Checking product: ${nombre} (${f.precio})`);
            
            // Upsert products to ensure they exist and have correct price/keys
            const { data: existing } = await supabase.from('productos')
                .select('id')
                .eq('marca_gaseosa', cat.slug)
                .eq('tipo_gaseosa', f.key)
                .single();

            if (existing) {
                await supabase.from('productos').update({ 
                    precio: f.precio, 
                    nombre: nombre, 
                    categoria_id: CATEGORIA_BEBIDAS_ID,
                    activo: true,
                    tipo: 'bebida'
                }).eq('id', existing.id);
            } else {
                await supabase.from('productos').insert({
                    nombre,
                    precio: f.precio,
                    tipo: 'bebida',
                    categoria_id: CATEGORIA_BEBIDAS_ID,
                    marca_gaseosa: cat.slug,
                    tipo_gaseosa: f.key,
                    fraccion_pollo: 0,
                    activo: true
                });
            }
        }
    }

    // 4. Initialize Stock for today
    console.log('Initializing Stock for Today...');
    const hoy = new Date().toLocaleDateString('en-CA');
    const { data: inv } = await supabase.from('inventario_diario').select('*').eq('fecha', hoy).single();
    
    if (inv) {
        const detalle = inv.bebidas_detalle || {};
        if (!detalle.vino) detalle.vino = {};
        detalle.vino.queirolo = 11;
        detalle.vino.estancia = 1;
        
        await supabase.from('inventario_diario').update({ bebidas_detalle: detalle }).eq('id', inv.id);
        console.log('Stock updated for Queirolo (11) and Estancia (1).');
    } else {
        console.log('No inventory today yet. Creating placeholder...');
        await supabase.from('inventario_diario').insert({
            fecha: hoy,
            bebidas_detalle: { vino: { queirolo: 11, estancia: 1 } },
            estado: 'abierto',
            pollos_enteros: 0,
            papas_bolsas: 0
        });
    }

    console.log('--- Initialization Finished ---');
}

run();
