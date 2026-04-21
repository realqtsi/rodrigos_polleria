export type UserRole = 'superadmin' | 'admin' | 'cajero' | 'mozo' | 'cocinero' | 'repartidor';

export interface Usuario {
    id: string;
    nombre: string;
    email: string;
    rol: UserRole;
    activo: boolean;
    created_at: string;
    negocio_id?: string;
}

export interface AuthUser {
    usuario: Usuario;
    token?: string;
}

// Configuración de permisos por rol
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
    superadmin: ['dashboard', 'apertura', 'pos', 'mesas', 'cocina', 'ventas', 'inventario', 'reportes', 'cierre', 'gastos', 'configuracion', 'delivery', 'superadmin_panel'],
    admin: ['dashboard', 'apertura', 'pos', 'mesas', 'cocina', 'ventas', 'inventario', 'reportes', 'cierre', 'gastos', 'configuracion', 'delivery'],
    cajero: ['dashboard', 'apertura', 'pos', 'mesas', 'cocina', 'ventas', 'inventario', 'reportes', 'cierre', 'gastos', 'configuracion'],
    mozo: ['dashboard', 'pos', 'mesas', 'cocina', 'ventas', 'delivery'],
    cocinero: ['cocina'],
    repartidor: ['delivery']
};

// Nombres amigables de roles
export const ROLE_NAMES: Record<UserRole, string> = {
    superadmin: 'Super Admin',
    admin: 'Administrador',
    cajero: 'Cajero',
    mozo: 'Mozo',
    cocinero: 'Cocina',
    repartidor: 'Repartidor'
};

// Verificar si un rol tiene permiso para acceder a una ruta
export function hasPermission(rol: UserRole, route: string): boolean {
    const permissions = ROLE_PERMISSIONS[rol] || [];
    return permissions.includes(route);
}

// Obtener rutas permitidas para un rol
export function getAllowedRoutes(rol: UserRole): string[] {
    return ROLE_PERMISSIONS[rol] || [];
}
