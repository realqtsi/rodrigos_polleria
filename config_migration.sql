-- Tabla para configuración centralizada del negocio e impresoras
CREATE TABLE IF NOT EXISTS configuracion_negocio (
    id SERIAL PRIMARY KEY,
    nombre_negocio TEXT DEFAULT 'Rodrigo''s - Brasas & Broasters',
    ruc TEXT,
    direccion TEXT,
    telefono TEXT,
    ip_impresora_cocina TEXT DEFAULT '192.168.1.100',
    ip_impresora_caja TEXT DEFAULT '192.168.1.101',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar fila inicial si no existe
INSERT INTO configuracion_negocio (id)
SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM configuracion_negocio WHERE id = 1);

-- Habilitar Realtime
ALTER TABLE configuracion_negocio REPLICA IDENTITY FULL;
