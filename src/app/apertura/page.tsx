'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, RefreshCw, ArrowRight, Plus, X } from 'lucide-react';
import { supabase, obtenerFechaHoy } from '@/lib/supabase';
import toast from 'react-hot-toast';
import type { BebidasDetalle } from '@/lib/database.types';
import ProtectedRoute from '@/components/ProtectedRoute';
import { motion, AnimatePresence } from 'framer-motion';
import { useBebidasConfig, type NuevaBebida } from '@/hooks/useBebidasConfig';

const DOT_COLOR_OPTIONS = [
    { label: 'Morado', value: 'bg-purple-500' },
    { label: 'Verde', value: 'bg-emerald-500' },
    { label: 'Rosa', value: 'bg-pink-500' },
    { label: 'Índigo', value: 'bg-indigo-500' },
    { label: 'Marrón', value: 'bg-amber-700' },
    { label: 'Lima', value: 'bg-lime-500' },
    { label: 'Cian', value: 'bg-cyan-500' },
    { label: 'Gris', value: 'bg-slate-500' },
];



export default function AperturaPage() {
    return (
        <ProtectedRoute>
            <AperturaContent />
        </ProtectedRoute>
    );
}

function AperturaContent() {
    const router = useRouter();
    const [pollosEnteros, setPollosEnteros] = useState('');
    const [papasIniciales, setPapasIniciales] = useState('');
    const [chichaInicial, setChichaInicial] = useState('');
    const [dineroInicial, setDineroInicial] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingPrevious, setLoadingPrevious] = useState(true);
    const [previousDayLoaded, setPreviousDayLoaded] = useState(false);

    // Dynamic beverage catalog
    const { allBrands, mergeWithStock, addBeverage, loading: loadingCatalog } = useBebidasConfig();

    // Detailed beverage state (dynamic)
    const [bebidasDetalle, setBebidasDetalle] = useState<Record<string, Record<string, number>>>({});
    const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());

    // Modal state for adding new beverage
    const [showAddModal, setShowAddModal] = useState(false);
    const [newBevName, setNewBevName] = useState('');
    const [newBevColor, setNewBevColor] = useState('bg-purple-500');
    const [newBevFormats, setNewBevFormats] = useState<{ key: string; label: string; desc: string; precio: number }[]>(
        [{ key: 'personal', label: 'Personal', desc: '500ml', precio: 3.00 }]
    );
    const [savingBev, setSavingBev] = useState(false);

    // Cargar stock del día anterior al montar
    useEffect(() => {
        loadPreviousDayStock();
    }, []);

    const loadPreviousDayStock = async () => {
        setLoadingPrevious(true);
        try {
            const { data } = await supabase
                .from('inventario_diario')
                .select('bebidas_detalle')
                .eq('estado', 'cerrado')
                .not('bebidas_detalle', 'is', null) // Asegurar que tenga detalle
                .order('fecha', { ascending: false })
                .limit(1)
                .single();

            if (data) {
                if (data.bebidas_detalle) {
                    setBebidasDetalle(data.bebidas_detalle as any);
                }
                // Si hay stock de gaseosas disponible, lo usamos como base, pero el detalle es la fuente de verdad.
                // El usuario pidió que se cargue solo una vez y se guarde para el día siguiente.
                // Al cargar el detalle del cierre anterior, ya estamos cumpliendo esto.
                // Solo falta confirmar que esto se guarde como "stock inicial" del nuevo día.
                // En `handleGuardarApertura` se usa `bebidasDetalle` para init.

                setPreviousDayLoaded(true);
                toast.success('Stock de bebidas del día anterior cargado automáticamente (Continuidad)', { icon: '📦' });
            }
        } catch {
            console.log('No se encontró stock previo de bebidas');
        } finally {
            setLoadingPrevious(false);
        }
    };

    const updateBeverage = (brand: string, size: string, value: string) => {
        const numValue = value === '' ? 0 : parseInt(value) || 0;
        setBebidasDetalle(prev => ({
            ...prev,
            [brand]: {
                ...(prev[brand] || {}),
                [size]: numValue
            }
        }));
    };

    const calculateTotalBeverages = (): number => {
        let total = 0;
        Object.values(bebidasDetalle).forEach(brand => {
            if (brand) {
                Object.values(brand).forEach(qty => {
                    total += (qty as number) || 0;
                });
            }
        });
        return total;
    };

    // Initialize/merge beverage state when catalog loads
    useEffect(() => {
        if (!loadingCatalog && allBrands.length > 0) {
            setBebidasDetalle(prev => {
                const hasData = Object.keys(prev).length > 0;
                return hasData ? mergeWithStock(prev) : mergeWithStock({});
            });
        }
    }, [loadingCatalog, allBrands.length]);

    const resetBeverages = () => {
        setBebidasDetalle(mergeWithStock({}));
        setPreviousDayLoaded(false);
        toast.success('Stock de bebidas reiniciado');
    };

    const handleAddBeverage = async () => {
        if (!newBevName.trim()) { toast.error('Ingresa un nombre'); return; }
        if (newBevFormats.length === 0) { toast.error('Agrega al menos un formato'); return; }
        for (const f of newBevFormats) {
            if (!f.label.trim() || !f.desc.trim()) { toast.error('Completa todos los campos del formato'); return; }
        }
        setSavingBev(true);
        const result = await addBeverage({
            nombre: newBevName.trim(),
            dot_color: newBevColor,
            formatos: newBevFormats.map(f => ({
                ...f,
                key: f.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
            })),
        });
        setSavingBev(false);
        if (result.success) {
            toast.success(result.message);
            setShowAddModal(false);
            setNewBevName('');
            setNewBevFormats([{ key: 'personal', label: 'Personal', desc: '500ml', precio: 3.00 }]);
        } else {
            toast.error(result.message);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const pollos = parseFloat(pollosEnteros);
        const papas = parseFloat(papasIniciales) || 0;
        const chicha = parseFloat(chichaInicial) || 0;
        const totalBebidas = calculateTotalBeverages();

        if (isNaN(pollos) || pollos < 0) {
            toast.error('La cantidad de pollos debe ser un número válido');
            return;
        }

        setLoading(true);

        try {
            const fechaHoy = obtenerFechaHoy();

            // Verificar si ya existe apertura para hoy
            const { data: existente } = await supabase
                .from('inventario_diario')
                .select('*')
                .eq('fecha', fechaHoy)
                .single();

            if (existente) {
                // Permitir sobrescribir si el usuario confirma (o implícitamente al enviar de nuevo)
                // Para simplificar UX, haremos un UPDATE si ya existe
                const { error: updateError } = await supabase
                    .from('inventario_diario')
                    .update({
                        pollos_enteros: pollos,
                        papas_iniciales: papas,
                        chicha_inicial: chicha,
                        gaseosas: totalBebidas,
                        dinero_inicial: parseFloat(dineroInicial) || 0,
                        bebidas_detalle: bebidasDetalle,
                        // No tocamos la fecha ni el id
                    })
                    .eq('fecha', fechaHoy);

                if (updateError) throw updateError;

                toast.success(
                    `¡Apertura ACTUALIZADA!\nDatos corregidos para el día de hoy.`,
                    { duration: 4000, icon: '🔄' }
                );

                setTimeout(() => {
                    router.push('/');
                }, 1500);
                return;
            }

            // Insertar nueva apertura
            const { error } = await supabase
                .from('inventario_diario')
                .insert({
                    fecha: fechaHoy,
                    pollos_enteros: pollos,
                    papas_iniciales: papas,
                    chicha_inicial: chicha,
                    gaseosas: totalBebidas,
                    dinero_inicial: parseFloat(dineroInicial) || 0,
                    bebidas_detalle: bebidasDetalle,
                })
                .select()
                .single();

            if (error) throw error;

            toast.success(
                `¡Día iniciado exitosamente!\nPollos: ${pollos} | Chicha: ${chicha}L | Bebidas: ${totalBebidas}`,
                { duration: 3000, icon: '✅' }
            );

            setTimeout(() => {
                router.push('/');
            }, 1500);

        } catch (error: any) {
            console.error('Error al guardar apertura:', error);
            const errorMessage = error?.message || (typeof error === 'string' ? error : 'Error desconocido');
            toast.error(`Error al iniciar el día: ${errorMessage}`, { duration: 8000 });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-8 lg:p-12 pb-32">
            <div className="max-w-4xl mx-auto">
                <header className="mb-12">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-4 mb-3"
                    >
                        <div className="w-1.5 h-10 bg-rodrigo-terracotta rounded-full shadow-sm" />
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic">
                            Apertura de Día
                        </h1>
                    </motion.div>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] ml-6 italic">
                        Configuración inicial • Gestión de Inventario
                    </p>
                </header>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Pollos Enteros y Papas */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Pollos Enteros */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-rodrigo-terracotta/5 blur-3xl -mr-16 -mt-16 group-hover:bg-rodrigo-terracotta/10 transition-colors"></div>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm group-hover:border-rodrigo-terracotta/30 transition-colors">
                                    <img src="/images/pollo-brasa.png" alt="Pollo" className="w-10 h-10 object-contain brightness-100" />
                                </div>
                                <div>
                                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Pollos Enteros</h2>
                                    <p className="text-[10px] font-bold text-rodrigo-terracotta uppercase tracking-widest mt-1 italic">Stock Inicial</p>
                                </div>
                            </div>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    step="0.125"
                                    value={pollosEnteros}
                                    onChange={(e) => setPollosEnteros(e.target.value)}
                                    placeholder="0"
                                    disabled={loading}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-4xl font-black text-slate-900 italic outline-none focus:border-rodrigo-terracotta/30 focus:bg-white focus:ring-4 focus:ring-rodrigo-terracotta/5 transition-all placeholder:text-slate-200"
                                    required
                                />
                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-black italic uppercase text-xs">Unidades</span>
                            </div>
                        </motion.div>

                        {/* Papas (KG) */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-rodrigo-mustard/5 blur-3xl -mr-16 -mt-16 group-hover:bg-rodrigo-mustard/10 transition-colors"></div>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm group-hover:border-rodrigo-mustard/30 transition-colors">
                                    <span className="text-3xl">🥔</span>
                                </div>
                                <div>
                                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Papas (Kg)</h2>
                                    <p className="text-[10px] font-bold text-rodrigo-mustard uppercase tracking-widest mt-1 italic">Papa Pelada</p>
                                </div>
                            </div>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={papasIniciales}
                                    onChange={(e) => setPapasIniciales(e.target.value)}
                                    placeholder="0.0"
                                    disabled={loading}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-4xl font-black text-slate-900 italic outline-none focus:border-rodrigo-mustard/30 focus:bg-white focus:ring-4 focus:ring-rodrigo-mustard/5 transition-all placeholder:text-slate-200"
                                />
                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-black italic uppercase text-xs">Kilogramos</span>
                            </div>
                        </motion.div>

                        {/* Chicha (L) */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group lg:col-span-1 md:col-span-2"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-purple-500/10 transition-colors"></div>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm group-hover:border-purple-500/30 transition-colors">
                                    <span className="text-3xl">🟣</span>
                                </div>
                                <div>
                                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Chicha (L)</h2>
                                    <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mt-1 italic">Preparada</p>
                                </div>
                            </div>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={chichaInicial}
                                    onChange={(e) => setChichaInicial(e.target.value)}
                                    placeholder="0.00"
                                    disabled={loading}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-4xl font-black text-slate-900 italic outline-none focus:border-purple-500/30 focus:bg-white focus:ring-4 focus:ring-purple-500/5 transition-all placeholder:text-slate-200"
                                />
                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-black italic uppercase text-xs">Litros</span>
                            </div>
                        </motion.div>
                    </div>

                    {/* Bebidas - Sección Premium */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="glass-panel relative overflow-hidden"
                    >
                        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 bg-blue-500/10 rounded-[1.5rem] border border-blue-100 flex items-center justify-center text-blue-600">
                                        <RefreshCw size={28} className={loadingPrevious ? 'animate-spin' : ''} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Stock de Bebidas</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-black text-blue-600/80 uppercase tracking-widest">
                                                Total: {calculateTotalBeverages()} Unidades
                                            </span>
                                            {previousDayLoaded && (
                                                <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                                    <Check size={10} /> Sincronizado
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={resetBeverages}
                                    className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-300 hover:text-rodrigo-terracotta hover:border-rodrigo-terracotta/30 transition-all shadow-sm"
                                    title="Reiniciar a cero"
                                >
                                    <RefreshCw size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="p-8">
                            {(loadingPrevious || loadingCatalog) ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-4">
                                    <div className="w-12 h-12 border-4 border-slate-100 border-t-rodrigo-mustard rounded-full animate-spin"></div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Cargando stock previo...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {allBrands.map((marca) => {
                                            const brandData = bebidasDetalle[marca.key] as Record<string, number> | undefined;
                                            const brandTotal = marca.sizes.reduce((sum, s) => sum + ((brandData?.[s.key]) || 0), 0);
                                            const isOpen = expandedBrands.has(marca.key);
                                            const isYellow = marca.key === 'inca_kola';

                                            const toggleBrand = () => {
                                                setExpandedBrands(prev => {
                                                    const next = new Set(prev);
                                                    if (next.has(marca.key)) next.delete(marca.key);
                                                    else next.add(marca.key);
                                                    return next;
                                                });
                                            };

                                            return (
                                                <div key={marca.key} className={`rounded-[2.5rem] border transition-all duration-300 ${isOpen
                                                    ? 'bg-white border-slate-200 shadow-lg'
                                                    : isYellow
                                                        ? 'bg-rodrigo-mustard/10 border-rodrigo-mustard/20 hover:border-rodrigo-mustard/40'
                                                        : !marca.isCore
                                                            ? 'bg-indigo-50/50 border-indigo-100 hover:border-indigo-200'
                                                            : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                                                    }`}>
                                                    <button
                                                        type="button"
                                                        onClick={toggleBrand}
                                                        className="w-full flex items-center gap-4 px-6 py-5 text-left"
                                                    >
                                                        <div className={`w-4 h-4 rounded-full shrink-0 shadow-sm ${marca.dot}`}></div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <h3 className={`text-xs font-black uppercase tracking-widest ${isYellow ? 'text-rodrigo-brown' : 'text-slate-900'}`}>{marca.name}</h3>
                                                                {!marca.isCore && <span className="text-[8px] font-black bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-md uppercase tracking-wider">Extra</span>}
                                                            </div>
                                                            <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${isYellow ? 'text-rodrigo-mustard/80' : 'text-slate-400'}`}>{brandTotal} Unidades totales</p>
                                                        </div>
                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${isOpen ? 'rotate-180 bg-rodrigo-terracotta text-white' : 'bg-slate-200/50 text-slate-400'}`}>
                                                            <ArrowRight className="rotate-90" size={14} />
                                                        </div>
                                                    </button>

                                                    <AnimatePresence>
                                                        {isOpen && (
                                                            <motion.div
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                exit={{ opacity: 0, height: 0 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="px-6 pb-8 pt-2 space-y-3 border-t border-slate-100">
                                                                    {marca.sizes.map((size) => {
                                                                        const val = (brandData?.[size.key]) || 0;
                                                                        return (
                                                                            <div key={size.key} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group/size hover:bg-white hover:border-rodrigo-terracotta/20 transition-all">
                                                                                <div className="flex-1 min-w-0">
                                                                                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight group-hover/size:text-rodrigo-terracotta transition-colors">{size.label}</p>
                                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">{size.desc}</p>
                                                                                </div>
                                                                                <div className="relative">
                                                                                    <input
                                                                                        type="number"
                                                                                        inputMode="numeric"
                                                                                        min="0"
                                                                                        value={val === 0 ? '' : val}
                                                                                        placeholder="0"
                                                                                        onChange={(e) => updateBeverage(marca.key, size.key, e.target.value)}
                                                                                        onFocus={(e) => (e.target as any).select()}
                                                                                        className="w-24 bg-white border-2 border-slate-200 rounded-xl px-4 py-2.5 text-center text-sm font-black text-slate-900 focus:border-rodrigo-terracotta focus:ring-4 focus:ring-rodrigo-terracotta/5 outline-none transition-all placeholder:text-slate-200"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Botón Añadir Bebida Extra */}
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(true)}
                                        className="w-full mt-6 py-5 border-2 border-dashed border-indigo-200 rounded-[2rem] text-indigo-500 font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-indigo-50 hover:border-indigo-300 transition-all active:scale-[0.98]"
                                    >
                                        <Plus size={18} strokeWidth={3} />
                                        Añadir Bebida Extra
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Modal Añadir Bebida */}
                        <AnimatePresence>
                            {showAddModal && (
                                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
                                    >
                                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                            <div>
                                                <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tight">Nueva Bebida</h3>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Registrar marca extra al catálogo</p>
                                            </div>
                                            <button onClick={() => setShowAddModal(false)} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors">
                                                <X size={18} />
                                            </button>
                                        </div>

                                        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                                            {/* Nombre */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre de la bebida</label>
                                                <input
                                                    type="text"
                                                    value={newBevName}
                                                    onChange={(e) => setNewBevName(e.target.value)}
                                                    placeholder="Ej: Pepsi, Guaraná, Sprite..."
                                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-900 italic focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all placeholder:text-slate-200"
                                                />
                                            </div>

                                            {/* Color */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Color Identificador</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {DOT_COLOR_OPTIONS.map((c) => (
                                                        <button
                                                            key={c.value}
                                                            type="button"
                                                            onClick={() => setNewBevColor(c.value)}
                                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-[10px] font-black uppercase tracking-wider transition-all ${newBevColor === c.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                                                }`}
                                                        >
                                                            <div className={`w-3 h-3 rounded-full ${c.value}`}></div>
                                                            {c.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Formatos */}
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Formatos / Tamaños</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setNewBevFormats(prev => [...prev, { key: '', label: '', desc: '', precio: 3.00 }])}
                                                        className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1 hover:text-indigo-700 transition-colors"
                                                    >
                                                        <Plus size={12} /> Añadir Formato
                                                    </button>
                                                </div>
                                                {newBevFormats.map((fmt, idx) => (
                                                    <div key={idx} className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                        <div className="flex-1 space-y-2">
                                                            <input
                                                                type="text"
                                                                value={fmt.label}
                                                                onChange={(e) => {
                                                                    const u = [...newBevFormats];
                                                                    u[idx].label = e.target.value;
                                                                    setNewBevFormats(u);
                                                                }}
                                                                placeholder="Ej: Personal, 1.5L, Familiar"
                                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-900 italic outline-none focus:border-indigo-400 transition-all placeholder:text-slate-200"
                                                            />
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={fmt.desc}
                                                                    onChange={(e) => {
                                                                        const u = [...newBevFormats];
                                                                        u[idx].desc = e.target.value;
                                                                        setNewBevFormats(u);
                                                                    }}
                                                                    placeholder="500ml, 1L..."
                                                                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-200"
                                                                />
                                                                <div className="relative">
                                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">S/</span>
                                                                    <input
                                                                        type="number"
                                                                        step="0.50"
                                                                        min="0"
                                                                        value={fmt.precio}
                                                                        onChange={(e) => {
                                                                            const u = [...newBevFormats];
                                                                            u[idx].precio = parseFloat(e.target.value) || 0;
                                                                            setNewBevFormats(u);
                                                                        }}
                                                                        className="w-24 bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-black text-slate-900 outline-none focus:border-indigo-400 transition-all"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {newBevFormats.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setNewBevFormats(prev => prev.filter((_, i) => i !== idx))}
                                                                className="w-8 h-8 bg-red-50 text-red-400 rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors shrink-0"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="p-6 border-t border-slate-100 bg-slate-50">
                                            <button
                                                type="button"
                                                onClick={handleAddBeverage}
                                                disabled={savingBev}
                                                className="w-full py-4 bg-indigo-600 text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl shadow-lg hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                            >
                                                {savingBev ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={3} />}
                                                {savingBev ? 'Registrando...' : 'Registrar Bebida'}
                                            </button>
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Caja Chica */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors"></div>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm group-hover:border-emerald-500/30 transition-colors">
                                <span className="text-emerald-600 font-black text-xl">S/</span>
                            </div>
                            <div>
                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Caja Chica</h2>
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1 italic">Dinero Inicial</p>
                            </div>
                        </div>
                        <div className="relative">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-emerald-600 italic">S/</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={dineroInicial}
                                onChange={(e) => setDineroInicial(e.target.value)}
                                placeholder="0.00"
                                disabled={loading}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-16 pr-6 py-5 text-4xl font-black text-slate-900 italic outline-none focus:border-emerald-500/30 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all placeholder:text-slate-200"
                            />
                        </div>
                    </motion.div>

                    {/* Botón Submit */}
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        type="submit"
                        disabled={loading || loadingPrevious}
                        className="w-full py-6 bg-rodrigo-mustard text-rodrigo-brown font-black text-lg rounded-3xl shadow-[0_20px_50px_-15px_rgba(234,179,8,0.4)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4 uppercase tracking-[0.2em] italic"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={24} className="animate-spin" />
                                <span>Procesando...</span>
                            </>
                        ) : (
                            <>
                                <Check size={24} strokeWidth={3} />
                                <span>Iniciar Jornada</span>
                            </>
                        )}
                    </motion.button>
                </form>
            </div>
        </div>
    );
}

