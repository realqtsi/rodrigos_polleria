
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL=')).split('=')[1].trim();
const key = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')).split('=')[1].trim();

const fechaHoy = '2026-04-08';

async function testRegister() {
  console.log('Testing register logic for ' + fechaHoy);
  
  const payload = {
    fecha: fechaHoy,
    items: [{ producto_id: 'test', nombre: 'Test Product', cantidad: 1, precio: 10, fraccion_pollo: 0 }],
    total: 10,
    pollos_restados: 0,
    gaseosas_restadas: 0,
    chicha_restada: 0,
    bebidas_detalle: {},
    mesa_id: null,
    estado_pedido: 'pendiente',
    estado_pago: 'pendiente',
    notas: 'Test case',
    tipo_pedido: 'llevar',
    costo_envio: 0,
    direccion_envio: null,
    distancia_km: 0,
    estado_delivery: null,
    metodo_pago: 'efectivo' // This is what we added in the code
  };

  const res = await fetch(url + '/rest/v1/ventas', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': 'Bearer ' + key,
          'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
  });
  
  const result = await res.json();
  console.log('Status:', res.status);
  console.log('Result:', result);
  
  if (res.status === 201) {
    console.log('SUCCESS: Record created.');
    // Cleanup
    await fetch(url + '/rest/v1/ventas?id=eq.' + result[0].id, {
        method: 'DELETE',
        headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
    });
    console.log('Cleanup: Record deleted.');
  } else {
    console.log('FAILED: ' + JSON.stringify(result));
  }
}

testRegister();

