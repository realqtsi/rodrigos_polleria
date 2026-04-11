-- =============================================
-- CATALOGO DE BEBIDAS EXTRA (Dinámicas)
-- Ejecutar en Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS catalogo_bebidas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,                           -- Ej: "Pepsi", "Guaraná"
    slug TEXT NOT NULL UNIQUE,                      -- Ej: "pepsi", "guarana"
    dot_color TEXT NOT NULL DEFAULT 'bg-purple-500', -- Tailwind class for dot
    formatos JSONB NOT NULL DEFAULT '[]'::jsonb,    -- [{key, label, desc, precio}]
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_catalogo_bebidas_activo ON catalogo_bebidas(activo);

-- RLS: Permitir lectura a todos los usuarios autenticados
ALTER TABLE catalogo_bebidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública de catálogo bebidas"
    ON catalogo_bebidas FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Escritura de catálogo bebidas"
    ON catalogo_bebidas FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_catalogo_bebidas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER catalogo_bebidas_updated_at
    BEFORE UPDATE ON catalogo_bebidas
    FOR EACH ROW
    EXECUTE FUNCTION update_catalogo_bebidas_updated_at();
