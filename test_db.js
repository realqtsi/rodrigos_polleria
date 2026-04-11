
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL=')).split('=')[1].trim();
const key = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')).split('=')[1].trim();

async function test() {
  console.log('Testing db...');
  const res = await fetch(url + '/rest/v1/rpc/obtener_stock_actual', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': 'Bearer ' + key
      },
      body: JSON.stringify({ fecha_consulta: '2026-04-08' })
  });
  console.log('RPC status:', res.status, await res.text());
  
  const resInv = await fetch(url + '/rest/v1/inventario_diario?select=*&order=fecha.desc&limit=5', {
      headers: {
          'apikey': key,
          'Authorization': 'Bearer ' + key
      }
  });
  console.log('Inventario diario:', await resInv.text());
}
test();

