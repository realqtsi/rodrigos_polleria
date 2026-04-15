'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Producto } from '@/lib/database.types';
import ProtectedRoute from '@/components/ProtectedRoute';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, X, Package, Pencil, Users, Settings, Trash2, Plus, RefreshCw, Loader2, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useBebidasConfig } from '@/hooks/useBebidasConfig';

type TipoProducto = 'pollo' | 'bebida' | 'complemento';

const TIPO_LABELS: Record<string, string> = {
    pollo: 'Pollos y Platos',
    bebida: 'Bebidas',
    complemento: 'Complementos',
    todos: 'Todos'
};

function ConfiguracionContent() {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editPrecio, setEditPrecio] = useState('');
    const [saving, setSaving] = useState(false);
    const [filtroTipo, setFiltroTipo] = useState<TipoProducto | 'todos'>('todos');

    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'precios' | 'usuarios' | 'impresoras' | 'bebidas'>('precios');
    const { customBrands, deleteBeverage, loading: loadingBebidas } = useBebidasConfig();
    const [config, setConfig] = useState<any>(null);
    const [editConfig, setEditConfig] = useState({
        ip_impresora_cocina: '',
        ip_impresora_caja: '',
        nombre_negocio: '',
        ruc: '',
        direccion: '',
        telefono: '',
        modo_impresion: 'red'
    });

    // Users stuff
    const [empleados, setEmpleados] = useState<any[]>([]);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editUserName, setEditUserName] = useState('');
    const [editUserRole, setEditUserRole] = useState('');
    const [editUserPassword, setEditUserPassword] = useState('');
    
    // New user form states
    const [showNewUserForm, setShowNewUserForm] = useState(false);
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState('mozo');

    const cargarProductos = async () => {
        try {
            const { data, error } = await supabase
                .from('productos')
                .select('*')
                .order('tipo', { ascending: true })
                .order('nombre', { ascending: true });

            if (error) throw error;
            setProductos(data || []);
        } catch (error) {
            console.error('Error al cargar productos:', error);
            toast.error('Error al cargar productos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarProductos();
        if (user && user.rol === 'admin') {
            cargarEmpleados();
            cargarConfiguracion();
        }
    }, [user]);

    const cargarConfiguracion = async () => {
        try {
            const { data, error } = await supabase
                .from('configuracion_negocio')
                .select('*')
                .eq('id', 1)
                .single();

            if (data && !error) {
                setConfig(data);
                setEditConfig({
                    ip_impresora_cocina: data.ip_impresora_cocina || '',
                    ip_impresora_caja: data.ip_impresora_caja || '',
                    nombre_negocio: data.nombre_negocio || '',
                    ruc: data.ruc || '',
                    direccion: data.direccion || '',
                    telefono: data.telefono || '',
                    modo_impresion: data.modo_impresion || 'red'
                });
            }
        } catch (err) {
            console.error('Error cargando config:', err);
        }
    };

    const guardarConfig = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('configuracion_negocio')
                .update(editConfig)
                .eq('id', 1);

            if (error) throw error;
            setConfig(editConfig);
            toast.success('Configuración guardada correctamente');
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al guardar configuración');
        } finally {
            setSaving(false);
        }
    };

    const cargarEmpleados = async () => {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .order('rol', { ascending: true })
                .order('nombre', { ascending: true });

            if (error) throw error;
            setEmpleados(data || []);
        } catch (error) {
            console.error('Error cargando empleados:', error);
        }
    };

    const iniciarEdicion = (producto: Producto) => {
        setEditingId(producto.id);
        setEditPrecio(producto.precio.toString());
    };

    const cancelarEdicion = () => {
        setEditingId(null);
        setEditPrecio('');
    };

    const guardarPrecio = async (producto: Producto) => {
        const nuevoPrecio = parseFloat(editPrecio);
        if (isNaN(nuevoPrecio) || nuevoPrecio < 0) {
            toast.error('Ingresa un precio válido');
            return;
        }

        if (nuevoPrecio === producto.precio) {
            cancelarEdicion();
            return;
        }

        setSaving(true);
        try {
            const { data, error } = await supabase
                .from('productos')
                .update({ precio: nuevoPrecio })
                .eq('id', producto.id)
                .select();

            if (error) throw error;

            if (!data || data.length === 0) {
                toast.error('No se pudo actualizar. Verifica permisos.', { duration: 5000 });
                return;
            }

            setProductos(prev => prev.map(p =>
                p.id === producto.id ? { ...p, precio: nuevoPrecio } : p
            ));

            toast.success(
                `${producto.nombre}: S/ ${nuevoPrecio.toFixed(2)}`,
                { duration: 3000 }
            );
            cancelarEdicion();
        } catch (error) {
            console.error('Error al actualizar precio:', error);
            toast.error('Error al guardar el precio');
        } finally {
            setSaving(false);
        }
    };

    const iniciarEdicionUsuario = (emp: any) => {
        setEditingUserId(emp.id);
        setEditUserName(emp.nombre);
        setEditUserRole(emp.rol);
        setEditUserPassword('');
    };

    const cancelarEdicionUsuario = () => {
        setEditingUserId(null);
        setEditUserName('');
        setEditUserRole('');
        setEditUserPassword('');
    };

    const guardarUsuario = async (emp: any) => {
        if (!editUserName.trim()) {
            toast.error('El nombre no puede estar vacío');
            return;
        }

        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    id: emp.id,
                    nombre: editUserName.trim(),
                    rol: editUserRole,
                    password: editUserPassword || undefined
                })
            });

            const data = await res.json().catch(() => ({ error: 'Respuesta inválida del servidor' }));
            if (!res.ok) throw new Error(data.error || `Error del servidor (${res.status})`);

            setEmpleados(prev => prev.map(p =>
                p.id === emp.id ? { ...p, nombre: editUserName.trim(), rol: editUserRole } : p
            ));

            toast.success('Usuario actualizado correctamente');
            cancelarEdicionUsuario();
        } catch (error: any) {
            console.error('Error:', error);
            toast.error(error.message || 'Error al actualizar usuario');
        } finally {
            setSaving(false);
        }
    };

    const crearUsuario = async () => {
        if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
            toast.error('Completa todos los campos');
            return;
        }

        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    nombre: newUserName.trim(),
                    email: newUserEmail.trim(),
                    password: newUserPassword,
                    rol: newUserRole
                })
            });

            const data = await res.json().catch(() => ({ error: 'Respuesta inválida del servidor' }));
            if (!res.ok) throw new Error(data.error || `Error del servidor (${res.status})`);

            toast.success('Usuario creado correctamente');
            setShowNewUserForm(false);
            setNewUserName('');
            setNewUserEmail('');
            setNewUserPassword('');
            cargarEmpleados();
        } catch (error: any) {
            console.error('Error:', error);
            toast.error(error.message || 'Error al crear usuario');
        } finally {
            setSaving(false);
        }
    };

    const eliminarUsuario = async (id: string, nombre: string) => {
        if (id === user?.id) {
            toast.error('No puedes eliminarte a ti mismo');
            return;
        }

        if (!confirm(`¿Estás seguro de eliminar a "${nombre}"? Esta acción no se puede deshacer.`)) {
            return;
        }

        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/admin/users?id=${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });

            const data = await res.json().catch(() => ({ error: 'Respuesta inválida del servidor' }));
            if (!res.ok) throw new Error(data.error || `Error del servidor (${res.status})`);

            setEmpleados(prev => prev.filter(p => p.id !== id));
            toast.success('Usuario eliminado');
        } catch (error: any) {
            console.error('Error:', error);
            toast.error(error.message || 'Error al eliminar usuario');
        } finally {
            setSaving(false);
        }
    };

    const productosFiltrados = productos.filter(p => {
        const matchBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
        const matchTipo = filtroTipo === 'todos' || p.tipo === filtroTipo;
        return matchBusqueda && matchTipo;
    });

    const productosPorTipo = productosFiltrados.reduce((acc, p) => {
        const tipo = p.tipo as TipoProducto;
        if (!acc[tipo]) acc[tipo] = [];
        acc[tipo].push(p);
        return acc;
    }, {} as Record<TipoProducto, Producto[]>);

    const tiposOrdenados: TipoProducto[] = ['pollo', 'bebida', 'complemento'];
    const conteos: Record<string, number> = {
        todos: productos.length,
        pollo: productos.filter(p => p.tipo === 'pollo').length,
        bebida: productos.filter(p => p.tipo === 'bebida').length,
        complemento: productos.filter(p => p.tipo === 'complemento').length,
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-8 lg:p-12">
            <div className="max-w-5xl mx-auto">
                {/* Header Section */}
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-4 mb-3"
                        >
                            <div className="w-1.5 h-10 bg-rodrigo-terracotta rounded-full shadow-sm" />
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic">
                                Ajustes
                            </h1>
                        </motion.div>
                        <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] ml-6 italic">
                            Configuración del Sistema • Panel Maestro
                        </p>
                    </div>

                    {user?.rol === 'admin' && (
                        <nav className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start shadow-sm">
                            {[
                                { id: 'precios', icon: Settings, label: 'Precios' },
                                { id: 'usuarios', icon: Users, label: 'Usuarios' },
                                { id: 'bebidas', icon: Package, label: 'Bebidas' },
                                { id: 'impresoras', icon: Package, label: 'Negocio' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <tab.icon size={14} strokeWidth={3} />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            ))}
                        </nav>
                    )}
                </header>

                <AnimatePresence mode="wait">
                    {activeTab === 'precios' && (
                        <motion.div
                            key="precios"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-8"
                        >
                            {/* Search & Filters */}
                            <div className="flex flex-col md:flex-row gap-6 items-center">
                                <div className="relative flex-1 w-full group">
                                    <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-rodrigo-terracotta transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="FILTRAR PRODUCTOS..."
                                        value={busqueda}
                                        onChange={(e) => setBusqueda(e.target.value)}
                                        className="w-full bg-white border-2 border-slate-100 rounded-3xl pl-16 pr-8 py-5 text-sm font-black text-slate-900 italic tracking-widest placeholder:text-slate-200 shadow-sm focus:border-rodrigo-terracotta/20 outline-none transition-all"
                                    />
                                </div>
                                <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] border border-slate-200 shadow-inner overflow-x-auto max-w-full">
                                    {(['todos', ...tiposOrdenados] as const).map(tipo => (
                                        <button
                                            key={tipo}
                                            onClick={() => setFiltroTipo(tipo)}
                                            className={`px-6 py-3 text-[9px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all whitespace-nowrap ${filtroTipo === tipo
                                                ? 'bg-white text-slate-900 shadow-md'
                                                : 'text-slate-400 hover:text-slate-600'
                                                }`}
                                        >
                                            {tipo === 'todos' ? 'TOTAL' : TIPO_LABELS[tipo]}
                                            <span className="ml-2 opacity-50 font-mono italic">[{conteos[tipo]}]</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-40 gap-6">
                                    <div className="w-12 h-12 border-4 border-slate-100 border-t-rodrigo-terracotta rounded-full animate-spin"></div>
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] animate-pulse italic">Indexando catálogo...</p>
                                </div>
                            ) : productosFiltrados.length === 0 ? (
                                <div className="bg-white border border-slate-100 rounded-[3rem] py-32 text-center shadow-sm">
                                    <Package size={64} className="mx-auto mb-6 opacity-5" />
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] italic">No se encontraron coincidencias</p>
                                </div>
                            ) : (
                                <div className="space-y-12">
                                    {tiposOrdenados.map(tipo => {
                                        const prods = productosPorTipo[tipo];
                                        if (!prods || prods.length === 0) return null;

                                        return (
                                            <div key={tipo} className="space-y-6">
                                                <div className="flex items-center gap-6 px-4">
                                                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] italic whitespace-nowrap">
                                                        {TIPO_LABELS[tipo]}
                                                    </h2>
                                                    <div className="flex-1 h-px bg-slate-100" />
                                                    <span className="text-[10px] font-black text-slate-200 font-mono italic">[{prods.length}]</span>
                                                </div>

                                                <div className="bg-white border border-slate-100 rounded-[2rem] sm:rounded-[3rem] shadow-sm overflow-hidden">
                                                    {/* Desktop Table */}
                                                    <div className="hidden sm:block overflow-x-auto">
                                                        <table className="w-full border-collapse text-left">
                                                            <thead>
                                                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                                                    <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Descripción</th>
                                                                    <th className="px-8 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] w-48 italic">Ajuste de Precio</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {prods.map((producto) => (
                                                                    <tr key={producto.id} className="group border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                                                        <td className="px-8 py-6">
                                                                            <div className="flex items-center gap-4">
                                                                                <span className={`text-lg font-bold tracking-tight italic transition-colors ${editingId === producto.id ? 'text-rodrigo-terracotta' : 'text-slate-900'}`}>
                                                                                    {producto.nombre}
                                                                                </span>
                                                                                {!producto.activo && (
                                                                                    <span className="text-[8px] font-black bg-rodrigo-terracotta/20 text-rodrigo-terracotta px-2 py-0.5 rounded-full uppercase tracking-widest border border-rodrigo-terracotta/30">
                                                                                        Inactivo
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-8 py-6 text-right">
                                                                            <AnimatePresence mode="wait">
                                                                                {editingId === producto.id ? (
                                                                                    <motion.div key="edit" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-end gap-3">
                                                                                        <span className="text-xl font-black text-rodrigo-terracotta italic">S/</span>
                                                                                        <input
                                                                                            type="number"
                                                                                            step="0.10"
                                                                                            value={editPrecio}
                                                                                            onChange={(e) => setEditPrecio(e.target.value)}
                                                                                            className="w-24 bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-right text-lg font-black text-slate-900 italic outline-none focus:border-rodrigo-terracotta/30 transition-all placeholder:text-slate-200"
                                                                                            autoFocus
                                                                                        />
                                                                                        <div className="flex gap-2">
                                                                                            <button onClick={() => guardarPrecio(producto)} disabled={saving} className="p-2 bg-slate-900 text-white rounded-lg shadow-lg"><Check size={16} strokeWidth={3} /></button>
                                                                                            <button onClick={cancelarEdicion} className="p-2 bg-slate-100 text-slate-400 rounded-lg hover:text-slate-600"><X size={16} strokeWidth={3} /></button>
                                                                                        </div>
                                                                                    </motion.div>
                                                                                ) : (
                                                                                    <motion.button
                                                                                        key="display"
                                                                                        initial={{ opacity: 0 }}
                                                                                        animate={{ opacity: 1 }}
                                                                                        onClick={() => iniciarEdicion(producto)}
                                                                                        className="flex items-center justify-end gap-4 w-full group/btn text-right"
                                                                                    >
                                                                                        <div className="flex flex-col items-end">
                                                                                            <span className="text-2xl font-black text-slate-900 italic tracking-tighter group-hover/btn:text-rodrigo-terracotta transition-colors">
                                                                                                S/ {producto.precio.toFixed(2)}
                                                                                            </span>
                                                                                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest opacity-0 group-hover/btn:opacity-100 transition-all -translate-y-1 group-hover/btn:translate-y-0">Editar Tarifa</span>
                                                                                        </div>
                                                                                        <Pencil size={16} className="text-slate-100 transition-all group-hover/btn:text-rodrigo-terracotta/40" />
                                                                                    </motion.button>
                                                                                )}
                                                                            </AnimatePresence>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    {/* Mobile Card Stack */}
                                                    <div className="sm:hidden divide-y divide-slate-100">
                                                        {prods.map((producto) => (
                                                            <div key={producto.id} className="p-5 flex flex-col gap-4">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-black text-slate-900 uppercase italic tracking-tight">{producto.nombre}</span>
                                                                        {!producto.activo && (
                                                                            <span className="text-[8px] font-black text-rodrigo-terracotta uppercase mt-1 tracking-widest">Inactivo</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Precio Actual</p>
                                                                        <p className="text-xl font-black text-slate-900 italic tracking-tighter">S/ {producto.precio.toFixed(2)}</p>
                                                                    </div>
                                                                </div>
                                                                
                                                                <AnimatePresence mode="wait">
                                                                    {editingId === producto.id ? (
                                                                        <motion.div key="edit-mobile" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3">
                                                                            <input
                                                                                type="number"
                                                                                step="0.10"
                                                                                value={editPrecio}
                                                                                onChange={(e) => setEditPrecio(e.target.value)}
                                                                                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-lg font-black text-slate-900 italic outline-none"
                                                                                autoFocus
                                                                            />
                                                                            <button onClick={() => guardarPrecio(producto)} disabled={saving} className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg"><Check size={20} strokeWidth={3} /></button>
                                                                            <button onClick={cancelarEdicion} className="w-12 h-12 bg-slate-200 text-slate-500 rounded-xl flex items-center justify-center"><X size={20} strokeWidth={3} /></button>
                                                                        </motion.div>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => iniciarEdicion(producto)}
                                                                            className="w-full py-3 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                                                                        >
                                                                            <Pencil size={14} /> Ajustar Tarifa
                                                                        </button>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'usuarios' && user?.rol === 'admin' && (
                        <motion.div
                            key="usuarios"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setShowNewUserForm(!showNewUserForm)}
                                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-lg"
                                >
                                    {showNewUserForm ? <X size={14} strokeWidth={3} /> : <Plus size={14} strokeWidth={3} />}
                                    {showNewUserForm ? 'Cancelar' : 'Nuevo Usuario'}
                                </button>
                            </div>

                            <AnimatePresence>
                                {showNewUserForm && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-white border-2 border-dashed border-slate-200 rounded-[2rem] p-8 overflow-hidden"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre</label>
                                                <input
                                                    type="text"
                                                    value={newUserName}
                                                    onChange={e => setNewUserName(e.target.value)}
                                                    placeholder="Nombre completo"
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold italic outline-none focus:border-rodrigo-terracotta/30"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Email</label>
                                                <input
                                                    type="email"
                                                    value={newUserEmail}
                                                    onChange={e => setNewUserEmail(e.target.value)}
                                                    placeholder="correo@rodrigos.com"
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold italic outline-none focus:border-rodrigo-terracotta/30"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Contraseña</label>
                                                <input
                                                    type="password"
                                                    value={newUserPassword}
                                                    onChange={e => setNewUserPassword(e.target.value)}
                                                    placeholder="••••••••"
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold italic outline-none focus:border-rodrigo-terracotta/30"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="flex-1 space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Rol</label>
                                                    <select
                                                        value={newUserRole}
                                                        onChange={e => setNewUserRole(e.target.value)}
                                                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold italic outline-none focus:border-rodrigo-terracotta/30"
                                                    >
                                                        <option value="mozo">Mozo</option>
                                                        <option value="admin">Administrador</option>
                                                        <option value="cajero">Cajero (Caja)</option>
                                                        <option value="cocinero">Cocina</option>
                                                        <option value="repartidor">Repartidor (Delivery)</option>
                                                    </select>
                                                </div>
                                                <button
                                                    onClick={crearUsuario}
                                                    disabled={saving}
                                                    className="bg-emerald-500 text-white p-3.5 rounded-xl self-end shadow-md hover:brightness-110 disabled:opacity-50"
                                                >
                                                    <Check size={20} strokeWidth={3} />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="bg-white border border-slate-100 rounded-[2rem] sm:rounded-[3rem] shadow-sm overflow-hidden">
                                {/* Desktop View */}
                                <div className="hidden sm:block overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                                <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-8 py-6 italic">Personal</th>
                                                <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-8 py-6 italic">Gestión de Cuenta</th>
                                                <th className="text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-8 py-6 italic w-20">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                        {empleados.map((emp) => (
                                            <tr key={emp.id} className="group border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col">
                                                        <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${emp.rol === 'admin' ? 'text-rodrigo-mustard' : 'text-rodrigo-terracotta'}`}>
                                                            {emp.rol}
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-400 font-mono tracking-tighter italic">{emp.email}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <AnimatePresence mode="wait">
                                                        {editingUserId === emp.id ? (
                                                            <motion.div key="edit" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-wrap items-center gap-3">
                                                                <div className="flex-1 space-y-1 min-w-[150px]">
                                                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre</label>
                                                                    <input
                                                                        type="text"
                                                                        value={editUserName}
                                                                        onChange={e => setEditUserName(e.target.value)}
                                                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 font-black italic focus:border-rodrigo-mustard/30 outline-none"
                                                                        placeholder="Nombre"
                                                                    />
                                                                </div>
                                                                <div className="flex-1 space-y-1 min-w-[150px]">
                                                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">Nueva Contraseña (Opcional)</label>
                                                                    <input
                                                                        type="password"
                                                                        value={editUserPassword}
                                                                        onChange={e => setEditUserPassword(e.target.value)}
                                                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 font-black italic focus:border-rodrigo-mustard/30 outline-none"
                                                                        placeholder="••••••••"
                                                                    />
                                                                </div>
                                                                <div className="space-y-1 w-full md:w-auto">
                                                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">Rol</label>
                                                                    <select 
                                                                        value={editUserRole}
                                                                        onChange={e => setEditUserRole(e.target.value)}
                                                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 font-black italic focus:border-rodrigo-mustard/30 outline-none"
                                                                    >
                                                                        <option value="mozo">Mozo</option>
                                                                        <option value="admin">Administrador</option>
                                                                        <option value="cajero">Cajero (Caja)</option>
                                                                        <option value="cocinero">Cocina</option>
                                                                        <option value="repartidor">Repartidor (Delivery)</option>
                                                                    </select>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button onClick={() => guardarUsuario(emp)} disabled={saving} className="p-2 bg-emerald-500 text-white rounded-lg hover:brightness-110 shadow-sm"><Check size={16} strokeWidth={3} /></button>
                                                                    <button onClick={cancelarEdicionUsuario} className="p-2 bg-slate-100 text-slate-400 rounded-lg hover:text-slate-600"><X size={16} strokeWidth={3} /></button>
                                                                </div>
                                                            </motion.div>
                                                        ) : (
                                                            <motion.button
                                                                key="display"
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                onClick={() => iniciarEdicionUsuario(emp)}
                                                                className="flex flex-col items-start gap-1 group/btn w-full"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-lg font-black text-slate-900 italic group-hover/btn:text-rodrigo-terracotta transition-colors tracking-tighter">
                                                                        {emp.nombre}
                                                                    </span>
                                                                    <Pencil size={12} className="text-slate-200 opacity-0 group-hover/btn:opacity-100 transition-all" />
                                                                </div>
                                                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Click para editar cuenta y contraseña</span>
                                                            </motion.button>
                                                        )}
                                                    </AnimatePresence>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <button 
                                                        onClick={() => eliminarUsuario(emp.id, emp.nombre)}
                                                        disabled={saving || emp.id === user?.id}
                                                        className="p-3 bg-slate-50 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all disabled:opacity-0"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile View (Card Stack) */}
                                <div className="sm:hidden divide-y divide-slate-100">
                                    {empleados.map((emp) => (
                                        <div key={emp.id} className="p-5 space-y-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex flex-col">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${emp.rol === 'admin' ? 'text-rodrigo-mustard' : 'text-rodrigo-terracotta'}`}>
                                                        {emp.rol}
                                                    </span>
                                                    <span className="text-sm font-black text-slate-900 italic tracking-tight uppercase">{emp.nombre}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 mt-1">{emp.email}</span>
                                                </div>
                                                <button 
                                                    onClick={() => eliminarUsuario(emp.id, emp.nombre)}
                                                    disabled={saving || emp.id === user?.id}
                                                    className="p-3 bg-red-50 text-red-500 rounded-xl active:bg-red-100 disabled:opacity-0"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            <AnimatePresence mode="wait">
                                                {editingUserId === emp.id ? (
                                                    <motion.div key="edit-mobile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-50 p-4 rounded-2xl space-y-4">
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                                                            <input
                                                                type="text"
                                                                value={editUserName}
                                                                onChange={e => setEditUserName(e.target.value)}
                                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold italic"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nueva Contraseña (Opcional)</label>
                                                            <input
                                                                type="password"
                                                                value={editUserPassword}
                                                                onChange={e => setEditUserPassword(e.target.value)}
                                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold italic"
                                                                placeholder="Dejar en blanco para no cambiar"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Rol de Usuario</label>
                                                            <select 
                                                                value={editUserRole}
                                                                onChange={e => setEditUserRole(e.target.value)}
                                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold italic"
                                                            >
                                                                <option value="mozo">Mozo</option>
                                                                <option value="admin">Administrador</option>
                                                                <option value="cajero">Cajero (Caja)</option>
                                                                <option value="cocinero">Cocina</option>
                                                                <option value="repartidor">Repartidor (Delivery)</option>
                                                            </select>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => guardarUsuario(emp)} disabled={saving} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest">Guardar Cambios</button>
                                                            <button onClick={cancelarEdicionUsuario} className="px-6 py-3 bg-slate-200 text-slate-500 rounded-xl font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                                                        </div>
                                                    </motion.div>
                                                ) : (
                                                    <button 
                                                        onClick={() => iniciarEdicionUsuario(emp)}
                                                        className="w-full py-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 active:bg-slate-100"
                                                    >
                                                        <Pencil size={14} /> Editar Cuenta
                                                    </button>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ))}
                                </div>
                            </div>
                    </motion.div>
                )}

                {activeTab === 'bebidas' && user?.rol === 'admin' && (
                    <motion.div
                        key="bebidas"
                        initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-white p-10 relative overflow-hidden border border-slate-100 rounded-[3rem] shadow-sm"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.4em] mb-2 flex items-center gap-3 italic">
                                        <div className="w-8 h-px bg-slate-900" />
                                        Catálogo de Bebidas
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-11">Gestiona marcas extras para el inventario</p>
                                </div>
                                <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                                    <Package size={24} />
                                </div>
                            </div>

                            {loadingBebidas ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 size={32} className="animate-spin text-indigo-500" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Cargando catálogo...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {customBrands.length === 0 ? (
                                        <div className="col-span-full py-16 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                                            <p className="text-sm font-bold text-slate-400 italic">No hay bebidas extras registradas.</p>
                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2">Agrégalas desde el panel de Apertura</p>
                                        </div>
                                    ) : (
                                        customBrands.map((brand) => (
                                            <div key={brand.key} className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 group relative hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                                                <div className="flex items-center gap-5 mb-6">
                                                    <div className={`w-5 h-5 rounded-full shadow-inner ${brand.dot}`}></div>
                                                    <div className="flex-1">
                                                        <h3 className="text-xl font-black text-slate-900 italic tracking-tight">{brand.name}</h3>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">{brand.key}</p>
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm(`¿Estás seguro de desactivar "${brand.name}"? Se mantendrá en el historial pero ya no aparecerá en ventas nuevas.`)) {
                                                                const res = await deleteBeverage(brand.catalogId!);
                                                                if (res.success) toast.success(res.message);
                                                                else toast.error(res.message);
                                                            }
                                                        }}
                                                        className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-200 hover:text-red-500 hover:border-red-100 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                </div>
                                                <div className="space-y-4">
                                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-3 italic flex items-center gap-2">
                                                        Formatos Registrados
                                                        <div className="flex-1 h-px bg-slate-100" />
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {brand.sizes.map((s) => (
                                                            <div key={s.key} className="bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
                                                                <span className="text-[10px] font-black text-slate-700 italic">{s.label}</span>
                                                                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-tighter">{s.desc}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            <div className="mt-12 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 flex gap-5 items-start">
                                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-sm">
                                    <Info size={20} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest italic">Nota del Sistema</p>
                                    <p className="text-[10px] font-bold text-indigo-400 leading-relaxed uppercase tracking-wider">
                                        Las bebidas extras registradas aquí aparecerán automáticamente en el panel de Apertura y Cierre para su control de inventario diario.
                                        Para registrar una nueva marca, utiliza el botón "Añadir Bebida Extra" en el panel de apertura.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'impresoras' && user?.rol === 'admin' && (
                        <motion.div
                            key="impresoras"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-8"
                        >
                            <div className="bg-white p-10 relative overflow-hidden border border-slate-100 rounded-[3rem] shadow-sm">
                                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                                    <Package size={120} className="text-slate-900" />
                                </div>
                                <div className="space-y-6">
                                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                <span className="text-xl">🖨️</span> Configuración de Impresión
                                            </h3>
                                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                                <button
                                                    onClick={() => setEditConfig({ ...editConfig, modo_impresion: 'red' })}
                                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${editConfig.modo_impresion === 'red' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                                                >
                                                    RED / LOCAL
                                                </button>
                                                <button
                                                    onClick={() => setEditConfig({ ...editConfig, modo_impresion: 'bridge' })}
                                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${editConfig.modo_impresion === 'bridge' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                                                >
                                                    CLOUD BRIDGE 🌉
                                                </button>
                                            </div>
                                        </div>

                                            {editConfig.modo_impresion === 'red' && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">IP Impresora Cocina</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Ej: 192.168.1.100"
                                                            value={editConfig.ip_impresora_cocina}
                                                            onChange={e => setEditConfig({ ...editConfig, ip_impresora_cocina: e.target.value })}
                                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rodrigo-mustard outline-none transition-all font-mono"
                                                        />
                                                        <p className="text-[10px] text-slate-400">Dirección IP estática de la impresora de cocina.</p>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">IP Impresora Caja</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Ej: 192.168.1.101"
                                                            value={editConfig.ip_impresora_caja}
                                                            onChange={e => setEditConfig({ ...editConfig, ip_impresora_caja: e.target.value })}
                                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rodrigo-mustard outline-none transition-all font-mono"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {editConfig.modo_impresion === 'bridge' && (
                                                <div className="p-8 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                                                    <h4 className="font-black text-emerald-900 uppercase tracking-widest text-sm">Modo Cloud Bridge Activo 🌉</h4>
                                                    <p className="text-xs text-emerald-600 mt-2 max-w-sm mx-auto">
                                                        La impresión se gestiona automáticamente desde la laptop del local. Asegúrate de tener abierta la ventana negra del Bridge.
                                                    </p>
                                                </div>
                                            )}
                                            
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-6 text-center">Requiere conexión HTTPS segura para funcionar</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-10 border border-slate-100 rounded-[3rem] shadow-sm">
                                    <h3 className="text-xs font-black text-rodrigo-terracotta uppercase tracking-[0.4em] mb-8 flex items-center gap-3 italic">
                                        <div className="w-8 h-px bg-rodrigo-terracotta" />
                                        Identidad del Local
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {[
                                            { label: 'Nombre Comercial', key: 'nombre_negocio' },
                                            { label: 'RUC', key: 'ruc' },
                                            { label: 'Teléfono', key: 'telefono' },
                                            { label: 'Dirección', key: 'direccion', full: true }
                                        ].map((field) => (
                                            <div key={field.key} className={`space-y-3 ${field.full ? 'md:col-span-2' : ''}`}>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">{field.label}</label>
                                                <input
                                                    type="text"
                                                    value={(editConfig as any)[field.key]}
                                                    onChange={e => setEditConfig({ ...editConfig, [field.key]: e.target.value })}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-slate-900 font-bold focus:border-rodrigo-terracotta/30 outline-none transition-all italic tracking-tight"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button
                                        onClick={guardarConfig}
                                        disabled={saving}
                                        className="px-12 py-5 bg-gradient-to-r from-rodrigo-terracotta to-rodrigo-mustard text-stone-950 font-black text-xs uppercase tracking-[0.3em] rounded-2xl shadow-xl shadow-rodrigo-mustard/10 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 italic"
                                    >
                                        {saving ? 'Procesando...' : 'Confirmar Cambios'}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        );
}

export default function ConfiguracionPage() {
    return (
        <ProtectedRoute requiredPermission="configuracion">
            <ConfiguracionContent />
        </ProtectedRoute>
    );
}
