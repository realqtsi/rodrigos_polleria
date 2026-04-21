-- Función para determinar si el usuario actual es superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
DECLARE
    user_rol TEXT;
BEGIN
    SELECT rol INTO user_rol FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
    RETURN user_rol = 'superadmin';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Ajustar políticas de la tabla negocios para permitir operaciones CRUD al superadmin
-- (Recordando que la tabla public.negocios ya tiene ENABLE ROW LEVEL SECURITY y política de SELECT para todos)

-- Política de inserción (solo superadmin)
CREATE POLICY "Superadmin puede insertar negocios"
    ON public.negocios
    FOR INSERT
    WITH CHECK (public.is_superadmin());

-- Política de actualización (solo superadmin)
CREATE POLICY "Superadmin puede actualizar negocios"
    ON public.negocios
    FOR UPDATE
    USING (public.is_superadmin())
    WITH CHECK (public.is_superadmin());

-- Política de borrado (solo superadmin)
CREATE POLICY "Superadmin puede borrar negocios"
    ON public.negocios
    FOR DELETE
    USING (public.is_superadmin());
