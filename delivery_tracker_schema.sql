-- Script de Supabase para Sistema de Delivery Tracker en Tiempo Real

-- 1. Crear tabla para la ubicación en vivo de repartidores
CREATE TABLE IF NOT EXISTS repartidores_ubicacion (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security e invocar políticas permisivas para desarrollo rápido
ALTER TABLE repartidores_ubicacion ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede leer (Cajeros)
CREATE POLICY "Enable read access for all users" ON repartidores_ubicacion
  FOR SELECT USING (true);

-- Todos los autenticados pueden insertar/actualizar (Repartidores)
CREATE POLICY "Enable all access for authenticated users" ON repartidores_ubicacion
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 2. Modificaciones a la tabla ventas para gestionar ciclo del delivery
ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS repartidor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS estado_delivery TEXT; -- 'buscando_repartidor', 'asignado', 'en_camino', 'entregado'

-- 3. Habilitar la Replicación de Supabase Realtime para capturar el GPS en vivo
-- NOTA: Si esto falla porque la publicación no existe, debes activarlo desde 
-- el Dashboard de Supabase en Database -> Replication -> Source -> supabase_realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'repartidores_ubicacion'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE repartidores_ubicacion;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    -- Ignorar si supabase_realtime no existe por default
    RAISE NOTICE 'Publicación supabase_realtime no encontrada. Confígurala manualmente.';
END $$;
