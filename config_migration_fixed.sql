-- Eliminamos la tabla si existe para evitar conflictos de tipos (UUID vs Integer)
DROP TABLE IF EXISTS configuracion_negocio;

-- Creamos la tabla con ID incremental (Integer)
CREATE TABLE configuracion_negocio (
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

-- Insertamos la configuración inicial
INSERT INTO configuracion_negocio (id, nombre_negocio)
VALUES (1, 'Rodrigo''s - Brasas & Broasters');

-- Habilitar Realtime
ALTER TABLE configuracion_negocio REPLICA IDENTITY FULL;
