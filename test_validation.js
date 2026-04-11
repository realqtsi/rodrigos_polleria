
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL=')).split('=')[1].trim();
const key = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')).split('=')[1].trim();

const fechaHoy = '2026-04-08';

async function testVentas() {
  console.log('Testing logic for ' + fechaHoy);
  
  // 1. Get inventory
  const resInv = await fetch(url + '/rest/v1/inventario_diario?select=*&fecha=eq.' + fechaHoy, {
      headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
  });
  const inventarios = await resInv.json();
  const inventario = inventarios[0];
  
  console.log('Inventario inicial:', inventario ? 'Found' : 'NOT FOUND');
  if (!inventario) return;

  // 2. Get sales
  const resSales = await fetch(url + '/rest/v1/ventas?select=pollos_restados,gaseosas_restadas,bebidas_detalle&fecha=eq.' + fechaHoy, {
      headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
  });
  const ventasDelDia = await resSales.json();
  console.log('Ventas encontradas hoy:', ventasDelDia.length);

  // 3. Calculate totals
  let totalPollosConsumidos = 0;
  let totalGaseosasConsumidas = 0;
  ventasDelDia.forEach(v => {
      totalPollosConsumidos += v.pollos_restados || 0;
      totalGaseosasConsumidas += v.gaseosas_restadas || 0;
  });

  const pollosDisponibles = (inventario.pollos_enteros || 0) - totalPollosConsumidos;
  const gaseosasDisponibles = (inventario.gaseosas || 0) - totalGaseosasConsumidas;

  console.log('--- RESULTADOS ---');
  console.log('Pollos Iniciales:', inventario.pollos_enteros);
  console.log('Pollos Consumidos:', totalPollosConsumidos);
  console.log('Pollos Disponibles:', pollosDisponibles);
  console.log('Gaseosas Iniciales:', inventario.gaseosas);
  console.log('Gaseosas Consumidas:', totalGaseosasConsumidas);
  console.log('Gaseosas Disponibles:', gaseosasDisponibles);
}

testVentas();

