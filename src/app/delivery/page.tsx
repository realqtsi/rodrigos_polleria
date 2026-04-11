'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { supabase } from '@/lib/supabase';
import { getDeliveryOrders, updateDeliveryStatus, upsertRepartidorUbicacion } from '@/lib/ventas';
import { Venta } from '@/lib/database.types';
import { MapPin, Navigation, CheckCircle2, Navigation2, Clock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function DeliveryDashboard() {
    const [orders, setOrders] = useState<Venta[]>([]);
    const [loading, setLoading] = useState(true);
    const [gpsActive, setGpsActive] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [confirmingPayment, setConfirmingPayment] = useState<string | null>(null);

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
        const prep = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserId(session.user.id);
            }
        };
        prep();
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

    useEffect(() => {
        if (!userId) return;

        let watchId: number;

        if ("geolocation" in navigator) {
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    upsertRepartidorUbicacion(userId, position.coords.latitude, position.coords.longitude);
                    setGpsActive(true);
                },
                (error) => {
                    console.error(`Error GPS [${error.code}]: ${error.message}`);
                    setGpsActive(false);
                    if (error.code === error.PERMISSION_DENIED) {
                        toast.error("Permiso de GPS denegado. La caja no podrá verte.");
                    }
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        } else {
            toast.error("Geolocalización no soportada por el navegador.");
        }

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [userId]);

    const handleAccept = async (orderId: string) => {
        if (!userId) return;
        const res = await updateDeliveryStatus(orderId, 'asignado', userId);
        if (res) {
            toast.success("Pedido aceptado");
            loadOrders();
        }
    };

    const handleEnCamino = async (orderId: string) => {
        const res = await updateDeliveryStatus(orderId, 'en_camino');
        if (res) {
            toast.success("Marcado en Camino");
            loadOrders();
        }
    };

    const handleDelivered = async (orderId: string, metodoPago: 'efectivo' | 'yape' | 'plin' | 'tarjeta') => {
        const res = await updateDeliveryStatus(orderId, 'entregado', undefined, metodoPago);
        if (res) {
            toast.success(`Pedido completado con ${metodoPago}`);
            setConfirmingPayment(null);
            loadOrders();
        }
    };

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
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Entregas 🛵</h1>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full">
                                        <div className={`w-2 h-2 rounded-full ${gpsActive ? 'bg-emerald-500 animate-pulse-subtle' : 'bg-red-500'}`}></div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${gpsActive ? 'text-emerald-600' : 'text-red-600'}`}>
                                            GPS {gpsActive ? 'Activo' : 'Offline'}
                                        </span>
                                    </div>
                                </div>
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
                            <p className="text-slate-400 text-xs max-w-[200px] mx-auto uppercase font-bold tracking-widest">Relájate, ¡te avisaremos cuando haya una nueva entrega!</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <AnimatePresence mode="popLayout">
                                {orders.map((order, idx) => {
                                    const isMine = order.repartidor_id === userId;
                                    const items = order.items || [];
                                    const totalItems = items.reduce((s, i) => s + (i.cantidad || 0), 0);

                                    return (
                                        <motion.div
                                            key={order.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            className={`
                                                relative bg-white rounded-[2rem] border overflow-hidden transition-all duration-500 shadow-sm
                                                ${isMine ? 'border-rodrigo-terracotta/30 ring-1 ring-rodrigo-terracotta/5' : 'border-slate-100'}
                                            `}
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
                                                        {order.estado_delivery === 'buscando_repartidor' ? 'NUEVO PEDIDO' :
                                                            order.estado_delivery === 'asignado' ? 'PREPARADO' : 'EN RUTA'}
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
                                                                APROX. 15-20 MIN
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Cobro Total</p>
                                                        <p className="text-3xl font-black text-slate-900 tracking-tighter shadow-sm italic">
                                                            S/{(order.total || 0).toFixed(2)}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Items Summary */}
                                                <div className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contenido ({totalItems} items)</span>
                                                        <button className="text-[10px] font-black text-rodrigo-terracotta uppercase tracking-widest hover:opacity-70">Ver Todo</button>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {items.slice(0, 2).map((item, id) => (
                                                            <div key={id} className="flex items-center gap-3">
                                                                <div className="w-6 h-6 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-[11px] font-black text-slate-900 shadow-sm">
                                                                    {item.cantidad}
                                                                </div>
                                                                <span className="text-sm font-bold text-slate-700 uppercase truncate italic">{item.nombre}</span>
                                                            </div>
                                                        ))}
                                                        {items.length > 2 && (
                                                            <p className="text-[10px] font-bold text-slate-300 italic pl-9">+ {items.length - 2} productos adicionales</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {confirmingPayment === order.id ? (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        className="bg-slate-50 border-2 border-slate-100 p-4 rounded-3xl"
                                                    >
                                                        <p className="text-[10px] font-black text-center mb-4 uppercase text-slate-400 tracking-[0.3em]">Confirmar Pago</p>
                                                        <div className="grid grid-cols-3 gap-2 mb-2">
                                                            <button onClick={() => handleDelivered(order.id, 'efectivo')} className="flex flex-col items-center gap-1 py-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-black text-slate-900 hover:bg-slate-50 transition-colors uppercase shadow-sm">
                                                                <span className="text-xl mb-1">💵</span> Efect
                                                            </button>
                                                            <button onClick={() => handleDelivered(order.id, 'yape')} className="flex flex-col items-center gap-1 py-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-black text-slate-900 hover:bg-slate-50 transition-colors uppercase shadow-sm">
                                                                <span className="text-xl mb-1">🟣</span> Yape
                                                            </button>
                                                            <button onClick={() => handleDelivered(order.id, 'plin')} className="flex flex-col items-center gap-1 py-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-black text-slate-900 hover:bg-slate-50 transition-colors uppercase shadow-sm">
                                                                <span className="text-xl mb-1">🔵</span> Plin
                                                            </button>
                                                        </div>
                                                        <button onClick={() => setConfirmingPayment(null)} className="w-full py-2 text-[10px] font-black text-slate-300 uppercase hover:text-slate-900 transition-colors tracking-widest">Cancelar</button>
                                                    </motion.div>
                                                ) : (
                                                    <div className="flex gap-3">
                                                        {order.estado_delivery === 'buscando_repartidor' && (
                                                            <button
                                                                onClick={() => handleAccept(order.id)}
                                                                className="flex-1 py-4 bg-rodrigo-mustard text-slate-900 font-black rounded-[1.5rem] shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm uppercase tracking-widest italic"
                                                            >
                                                                Tomar Pedido
                                                            </button>
                                                        )}

                                                        {isMine && order.estado_delivery === 'asignado' && (
                                                            <button
                                                                onClick={() => handleEnCamino(order.id)}
                                                                className="flex-1 py-4 bg-slate-900 text-white font-black rounded-[1.5rem] shadow-xl hover:brightness-110 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2 italic"
                                                            >
                                                                <Navigation2 size={18} className="animate-pulse" /> Iniciar Ruta
                                                            </button>
                                                        )}

                                                        {isMine && order.estado_delivery === 'en_camino' && (
                                                            <button
                                                                onClick={() => setConfirmingPayment(order.id)}
                                                                className="flex-1 py-4 bg-emerald-600 text-white font-black rounded-[1.5rem] shadow-xl hover:brightness-110 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2 italic"
                                                            >
                                                                <CheckCircle2 size={18} /> Entregado
                                                            </button>
                                                        )}

                                                        <a
                                                            href={getGoogleMapsLink(order.direccion_envio || '')}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="w-16 h-14 bg-white border border-slate-100 text-rodrigo-terracotta rounded-[1.5rem] flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
                                                        >
                                                            <MapPin size={24} />
                                                        </a>
                                                    </div>
                                                )}
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
