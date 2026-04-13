'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { supabase } from '@/lib/supabase';
import { getDeliveryOrders } from '@/lib/ventas';
import { Venta } from '@/lib/database.types';
import { MapPin, Navigation, Navigation2, Clock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function DeliveryDashboard() {
    const [orders, setOrders] = useState<Venta[]>([]);
    const [loading, setLoading] = useState(true);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const data = await getDeliveryOrders();
            setOrders(data);
        } catch (err) {
            console.error("[DeliveryDashboard] Error loading orders:", err);
            toast.error("Error al cargar pedidos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();

        const channel = supabase
            .channel('public:ventas')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas', filter: 'tipo_pedido=eq.delivery' }, () => {
                loadOrders();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const getGoogleMapsLink = (address: string) => {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ", Ayacucho")}`;
    };

    return (
        <ProtectedRoute requiredPermission="delivery">
            <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 lg:p-12 pb-32 md:pb-8">
                <div className="max-w-xl mx-auto space-y-8">
                    {/* Header */}
                    <header className="relative p-6 bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden group shadow-sm">
                        <div className="absolute inset-0 bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                        <div className="flex justify-between items-center relative z-10">
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Lista de Entregas 🛵</h1>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Solo consulta de pedidos</p>
                            </div>
                            <button
                                onClick={loadOrders}
                                className="w-12 h-12 flex items-center justify-center bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl transition-all shadow-sm"
                            >
                                <Clock size={24} className={loading ? 'animate-spin text-slate-400' : 'text-slate-400'} />
                            </button>
                        </div>
                    </header>

                    {loading && orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-4">
                            <Loader2 className="animate-spin text-rodrigo-terracotta" size={60} />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Buscando rutas...</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 shadow-sm">
                            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
                                <Navigation size={48} className="text-slate-200" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight italic">Sin pedidos por ahora</h3>
                            <p className="text-slate-400 text-xs max-w-[200px] mx-auto uppercase font-bold tracking-widest">No hay entregas pendientes en el sistema.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <AnimatePresence mode="popLayout">
                                {orders.map((order, idx) => {
                                    const items = order.items || [];
                                    const totalItems = items.reduce((s, i) => s + (i.cantidad || 0), 0);

                                    return (
                                        <motion.div
                                            key={order.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            className="relative bg-white rounded-[2rem] border border-slate-100 overflow-hidden transition-all duration-500 shadow-sm"
                                        >
                                            {/* Status Header */}
                                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                                <div className="flex items-center gap-2">
                                                    <span className={`
                                                        px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest
                                                        ${order.estado_delivery === 'buscando_repartidor' ? 'bg-sky-50 text-sky-600 border border-sky-100' :
                                                            order.estado_delivery === 'asignado' ? 'bg-rodrigo-mustard border border-rodrigo-mustard/20 text-slate-900' :
                                                                'bg-rodrigo-terracotta/10 text-rodrigo-terracotta border border-rodrigo-terracotta/20'}
                                                    `}>
                                                        {order.estado_delivery === 'buscando_repartidor' ? 'ESPERANDO' :
                                                            order.estado_delivery === 'asignado' ? 'EN PREPARACIÓN' : 'EN CAMINO'}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] font-mono text-slate-300">#{order.id.slice(0, 8).toUpperCase()}</span>
                                            </div>

                                            <div className="p-6">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="flex-1">
                                                        <h3 className="text-2xl font-black text-slate-900 leading-tight uppercase tracking-tight mb-1 italic">
                                                            {order.direccion_envio || 'VÍA PÚBLICA'}
                                                        </h3>
                                                        <div className="flex gap-4">
                                                            <div className="flex items-center gap-1 text-rodrigo-terracotta font-black text-sm italic">
                                                                <Navigation2 size={14} />
                                                                {(order.distancia_km || 0).toFixed(1)}KM
                                                            </div>
                                                            <div className="flex items-center gap-1 text-slate-400 font-bold text-sm italic">
                                                                <Clock size={14} />
                                                                ENTREGA ESTIMADA
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total a Pagar</p>
                                                        <p className="text-3xl font-black text-slate-900 tracking-tighter shadow-sm italic">
                                                            S/{(order.total || 0).toFixed(2)}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Items Summary */}
                                                <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contenido ({totalItems} items)</span>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {items.map((item, id) => (
                                                            <div key={id} className="flex items-center gap-3">
                                                                <div className="w-6 h-6 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-[11px] font-black text-slate-900 shadow-sm">
                                                                    {item.cantidad}
                                                                </div>
                                                                <span className="text-sm font-bold text-slate-700 uppercase truncate italic">{item.nombre}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="flex gap-3">
                                                    <a
                                                        href={getGoogleMapsLink(order.direccion_envio || '')}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex-1 py-4 bg-slate-900 text-white font-black rounded-[1.5rem] shadow-xl hover:brightness-110 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2 italic"
                                                    >
                                                        <MapPin size={18} /> Ver Mapa
                                                    </a>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}
