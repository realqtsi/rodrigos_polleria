import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

async function getSupabaseClient() {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch (error) {
                        // Ignorado en API Routes / Server Components
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.delete({ name, ...options });
                    } catch (error) {
                        // Ignorado en API Routes / Server Components
                    }
                },
            },
        }
    );
}

// Verificar si el usuario es administrador
async function checkAdmin(supabase: any) {
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) return { success: false, error: `Error de Auth: ${authError.message}` };
        if (!user) return { success: false, error: 'No se encontró sesión de usuario' };

        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('rol')
            .eq('id', user.id)
            .single();

        if (profileError) return { success: false, error: `Error de Perfil: ${profileError.message}` };
        if (!profile) return { success: false, error: 'No se encontró perfil de usuario' };
        if (profile.rol !== 'admin') return { success: false, error: `Rol insuficiente: ${profile.rol}` };

        return { success: true };
    } catch (err: any) {
        return { success: false, error: `Error interno: ${err.message}` };
    }
}

// POST: Crear nuevo usuario
export async function POST(request: Request) {
    const supabase = await getSupabaseClient();

    const adminCheck = await checkAdmin(supabase);
    if (!adminCheck.success) {
        return NextResponse.json({ error: `Acceso denegado: ${adminCheck.error}` }, { status: 403 });
    }

    try {
        const { email, password, nombre, rol } = await request.json();

        if (!email || !password || !nombre || !rol) {
            return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
        }

        // 1. Crear usuario en Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { nombre }
        });

        if (authError || !authData.user) {
            throw authError || new Error('Error al crear usuario en Auth');
        }

        // 2. Crear perfil en user_profiles
        // Nota: A veces hay disparadores en la DB que crean el perfil, 
        // pero aquí lo forzamos o actualizamos para asegurar el rol y nombre.
        const { error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .upsert({
                id: authData.user.id,
                email,
                nombre,
                rol,
                activo: true
            });

        if (profileError) {
            // Si falla el perfil, intentamos limpiar el auth para no dejar huérfanos
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            throw profileError;
        }

        return NextResponse.json({ message: 'Usuario creado correctamente', user: authData.user });
    } catch (error: any) {
        console.error('Error in POST /api/admin/users:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT: Actualizar usuario (nombre, rol, contraseña)
export async function PUT(request: Request) {
    const supabase = await getSupabaseClient();

    const adminCheck = await checkAdmin(supabase);
    if (!adminCheck.success) {
        return NextResponse.json({ error: `Acceso denegado: ${adminCheck.error}` }, { status: 403 });
    }

    try {
        const { id, email, password, nombre, rol } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
        }

        // 1. Actualizar Auth (si hay nueva contraseña o email)
        const updateData: any = {};
        if (password) updateData.password = password;
        if (email) updateData.email = email;
        if (nombre) updateData.user_metadata = { nombre };

        if (Object.keys(updateData).length > 0) {
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, updateData);
            if (authError) throw authError;
        }

        // 2. Actualizar Perfil
        const profileUpdate: any = {};
        if (nombre) profileUpdate.nombre = nombre;
        if (rol) profileUpdate.rol = rol;
        if (email) profileUpdate.email = email;

        const { error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .update(profileUpdate)
            .eq('id', id);

        if (profileError) throw profileError;

        return NextResponse.json({ message: 'Usuario actualizado correctamente' });
    } catch (error: any) {
        console.error('Error in PUT /api/admin/users:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Eliminar usuario
export async function DELETE(request: Request) {
    const supabase = await getSupabaseClient();

    if (!(await checkAdmin(supabase))) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
        }

        // 1. Eliminar de Auth
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (authError) throw authError;

        // 2. Eliminar de Perfil (usualmente cascada, pero aseguramos)
        const { error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .delete()
            .eq('id', id);

        if (profileError) throw profileError;

        return NextResponse.json({ message: 'Usuario eliminado correctamente' });
    } catch (error: any) {
        console.error('Error in DELETE /api/admin/users:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
