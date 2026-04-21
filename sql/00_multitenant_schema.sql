-- ==========================================
-- SCRIPT MULTI-TENANT (Plataforma Rodrigo's SaaS)
-- ==========================================
-- 1. CREACIÓN DE LA TABLA MAESTRA DE NEGOCIOS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.negocios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    color_primario TEXT,
    color_secundario TEXT,
    config_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS en la tabla negocios
ALTER TABLE public.negocios ENABLE ROW LEVEL SECURITY;

-- Política lectura: Todos pueden ver (para cargar branding por slug)
CREATE POLICY "Negocios son públicos para lectura"
    ON public.negocios
    FOR SELECT
    USING (true);

-- ==========================================
-- 2. ALTERAR TABLAS EXISTENTES PARA SOPORTAR negocio_id
-- ==========================================

-- Guardamos el ID del negocio principal por defecto para no romper las filas existentes
-- Si esto se corre antes de insertar negocios, el ID será generado y luego usado.

DO $$
DECLARE
    default_negocio_id UUID;
BEGIN
    -- Crear el negocio por defecto 'rodrigos' si no existe
    IF NOT EXISTS (SELECT 1 FROM public.negocios WHERE slug = 'rodrigos') THEN
        INSERT INTO public.negocios (nombre, slug, color_primario, color_secundario)
        VALUES ('Rodrigo''s', 'rodrigos', '#9a3412', '#eab308')
        RETURNING id INTO default_negocio_id;
    ELSE
        SELECT id INTO default_negocio_id FROM public.negocios WHERE slug = 'rodrigos';
    END IF;

    -- Procedemos a agregar las columnas FK

    -- TABLA: user_profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'negocio_id') THEN
        ALTER TABLE public.user_profiles ADD COLUMN negocio_id UUID REFERENCES public.negocios(id);
        UPDATE public.user_profiles SET negocio_id = default_negocio_id WHERE negocio_id IS NULL;
        ALTER TABLE public.user_profiles ALTER COLUMN negocio_id SET NOT NULL;
    END IF;

    -- TABLA: productos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'negocio_id') THEN
        ALTER TABLE public.productos ADD COLUMN negocio_id UUID REFERENCES public.negocios(id);
        UPDATE public.productos SET negocio_id = default_negocio_id WHERE negocio_id IS NULL;
        ALTER TABLE public.productos ALTER COLUMN negocio_id SET NOT NULL;
    END IF;

    -- TABLA: mesas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mesas' AND column_name = 'negocio_id') THEN
        ALTER TABLE public.mesas ADD COLUMN negocio_id UUID REFERENCES public.negocios(id);
        UPDATE public.mesas SET negocio_id = default_negocio_id WHERE negocio_id IS NULL;
        ALTER TABLE public.mesas ALTER COLUMN negocio_id SET NOT NULL;
    END IF;

    -- TABLA: categorias
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categorias' AND column_name = 'negocio_id') THEN
        ALTER TABLE public.categorias ADD COLUMN negocio_id UUID REFERENCES public.negocios(id);
        UPDATE public.categorias SET negocio_id = default_negocio_id WHERE negocio_id IS NULL;
        ALTER TABLE public.categorias ALTER COLUMN negocio_id SET NOT NULL;
    END IF;

    -- TABLA: inventario_diario
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventario_diario' AND column_name = 'negocio_id') THEN
        ALTER TABLE public.inventario_diario ADD COLUMN negocio_id UUID REFERENCES public.negocios(id);
        UPDATE public.inventario_diario SET negocio_id = default_negocio_id WHERE negocio_id IS NULL;
        ALTER TABLE public.inventario_diario ALTER COLUMN negocio_id SET NOT NULL;
    END IF;

    -- TABLA: ventas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ventas' AND column_name = 'negocio_id') THEN
        ALTER TABLE public.ventas ADD COLUMN negocio_id UUID REFERENCES public.negocios(id);
        UPDATE public.ventas SET negocio_id = default_negocio_id WHERE negocio_id IS NULL;
        ALTER TABLE public.ventas ALTER COLUMN negocio_id SET NOT NULL;
    END IF;

    -- TABLA: gastos
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gastos') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gastos' AND column_name = 'negocio_id') THEN
        ALTER TABLE public.gastos ADD COLUMN negocio_id UUID REFERENCES public.negocios(id);
        UPDATE public.gastos SET negocio_id = default_negocio_id WHERE negocio_id IS NULL;
        ALTER TABLE public.gastos ALTER COLUMN negocio_id SET NOT NULL;
    END IF;

    -- TABLA: configuracion_negocio
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'configuracion_negocio') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracion_negocio' AND column_name = 'negocio_id') THEN
        ALTER TABLE public.configuracion_negocio ADD COLUMN negocio_id UUID REFERENCES public.negocios(id);
        UPDATE public.configuracion_negocio SET negocio_id = default_negocio_id WHERE negocio_id IS NULL;
        ALTER TABLE public.configuracion_negocio ALTER COLUMN negocio_id SET NOT NULL;
    END IF;

    -- TABLA: repartidores_ubicacion
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'repartidores_ubicacion') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'repartidores_ubicacion' AND column_name = 'negocio_id') THEN
        ALTER TABLE public.repartidores_ubicacion ADD COLUMN negocio_id UUID REFERENCES public.negocios(id);
        UPDATE public.repartidores_ubicacion SET negocio_id = default_negocio_id WHERE negocio_id IS NULL;
        ALTER TABLE public.repartidores_ubicacion ALTER COLUMN negocio_id SET NOT NULL;
    END IF;

    -- TABLA: catalogo_bebidas
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'catalogo_bebidas') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalogo_bebidas' AND column_name = 'negocio_id') THEN
        ALTER TABLE public.catalogo_bebidas ADD COLUMN negocio_id UUID REFERENCES public.negocios(id);
        UPDATE public.catalogo_bebidas SET negocio_id = default_negocio_id WHERE negocio_id IS NULL;
        ALTER TABLE public.catalogo_bebidas ALTER COLUMN negocio_id SET NOT NULL;
    END IF;
END $$;

-- ==========================================
-- 3. POLÍTICAS RLS (Row Level Security)
-- ==========================================

-- Función auxiliar para obtener el negocio_id asociado al usuario logueado
CREATE OR REPLACE FUNCTION public.user_negocio_id()
RETURNS UUID AS $$
    SELECT negocio_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Activar RLS en todas las tablas a las que se les alteró la estructura
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gastos') THEN ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'configuracion_negocio') THEN ALTER TABLE public.configuracion_negocio ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'repartidores_ubicacion') THEN ALTER TABLE public.repartidores_ubicacion ENABLE ROW LEVEL SECURITY; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'catalogo_bebidas') THEN ALTER TABLE public.catalogo_bebidas ENABLE ROW LEVEL SECURITY; END IF; END $$;


-- CREAR POLÍTICAS GENÉRICAS DE AISLAMIENTO ============================
-- Se permite acceso total (ALL) si la fila coincide con el negocio_id del auth.uid()

-- 1. user_profiles
CREATE POLICY "user_profiles aislam" ON public.user_profiles FOR ALL USING (
  negocio_id = public.user_negocio_id() OR id = auth.uid()
);

-- 2. productos
CREATE POLICY "productos aislam" ON public.productos FOR ALL USING (
  negocio_id = public.user_negocio_id()
);

-- 3. mesas
CREATE POLICY "mesas aislam" ON public.mesas FOR ALL USING (
  negocio_id = public.user_negocio_id()
);

-- 4. categorias
CREATE POLICY "categorias aislam" ON public.categorias FOR ALL USING (
  negocio_id = public.user_negocio_id()
);

-- 5. inventario_diario
CREATE POLICY "inventario aislam" ON public.inventario_diario FOR ALL USING (
  negocio_id = public.user_negocio_id()
);

-- 6. ventas
CREATE POLICY "ventas aislam" ON public.ventas FOR ALL USING (
  negocio_id = public.user_negocio_id()
);

-- 7. gastos (condicional)
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gastos') THEN 
  CREATE POLICY "gastos aislam" ON public.gastos FOR ALL USING (negocio_id = public.user_negocio_id()); 
END IF; END $$;

-- 8. configuracion_negocio (condicional)
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'configuracion_negocio') THEN 
  CREATE POLICY "configuracion_negocio aislam" ON public.configuracion_negocio FOR ALL USING (negocio_id = public.user_negocio_id()); 
END IF; END $$;

-- 9. repartidores_ubicacion (condicional)
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'repartidores_ubicacion') THEN 
  CREATE POLICY "repartidores_ubicacion aislam" ON public.repartidores_ubicacion FOR ALL USING (negocio_id = public.user_negocio_id()); 
END IF; END $$;

-- 10. catalogo_bebidas (condicional)
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'catalogo_bebidas') THEN 
  CREATE POLICY "catalogo_bebidas aislam" ON public.catalogo_bebidas FOR ALL USING (negocio_id = public.user_negocio_id()); 
END IF; END $$;
