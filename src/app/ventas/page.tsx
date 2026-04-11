'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Venta, Mesa, ItemCarrito, ItemVenta } from '@/lib/database.types';
import { Users, DollarSign, Clock, ShoppingBag, Trash2, AlertTriangle, Printer, ChevronRight, CreditCard, Navigation } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import ReceiptModal from '@/components/ReceiptModal';
import SplitPaymentModal from '@/components/SplitPaymentModal';
import ProtectedRoute from '@/components/ProtectedRoute';

interface MesaConVenta extends Mesa {
    venta?: Venta;
}

export default function MesasActivasPage() {
    return (
        <ProtectedRoute>
            <MesasActivasContent />
        </ProtectedRoute>
    );
}

function MesasActivasContent() {
    const [mesasActivas, setMesasActivas] = useState<MesaConVenta[]>([]);
    const [ventasParaLlevar, setVentasParaLlevar] = useState<Venta[]>([]);
    const [ventasDelivery, setVentasDelivery] = useState<Venta[]>([]);
    const [loading, setLoading] = useState(true);

    const [showReceipt, setShowReceipt] = useState(false);
    const [receiptData, setReceiptData] = useState<{
        items: (ItemCarrito | ItemVenta)[];
        total: number;
        orderId: string;
        mesaNumero?: number;
        title?: string;
        isNewSale?: boolean;
    } | null>(null);

    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelData, setCancelData] = useState<{ ventaId: string; mesaId: number | null; label: string } | null>(null);

    const [showPayModal, setShowPayModal] = useState(false);
    const [payModalData, setPayModalData] = useState<{
        ventaId: string;
        mesaId: number | null;
        mesaNumero?: number;
        items: ItemVenta[];
        total: number;
    } | null>(null);

    const abrirModalCobro = (ventaId: string, mesaId: number | null, mesaNumero: number | undefined, items: ItemVenta[], total: number) => {
        setPayModalData({ ventaId, mesaId, mesaNumero, items, total });
        setShowPayModal(true);
    };

    useEffect(() => {
        cargarPedidosPendientes();

        const channel = supabase
            .channel('mesas-ventas-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, () => {
                cargarPedidosPendientes();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, () => {
                cargarPedidosPendientes();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const cargarPedidosPendientes = async () => {
        try {
            setLoading(true);
            const { data: ventasPendientes, error: ventasError } = await supabase
                .from('ventas')
                .select(`
                    *,
                    mesas:mesa_id (
                        id,
                        numero
                    )
                `)
                .eq('estado_pago', 'pendiente')
                .order('created_at', { ascending: false });

            if (ventasError) throw ventasError;

            const paraLlevar: Venta[] = [];
            const delivery: Venta[] = [];
            const mesasConVentas: MesaConVenta[] = [];

            (ventasPendientes || []).forEach(venta => {
                if (!venta.mesa_id) {
                    if (venta.tipo_pedido === 'delivery') {
                        delivery.push(venta);
                    } else {
                        paraLlevar.push(venta);
                    }
                } else {
                    mesasConVentas.push({
                        id: venta.mesa_id!,
                        numero: venta.mesas?.numero || 0,
                        estado: 'ocupada',
                        created_at: venta.created_at,
                        venta: venta
                    } as MesaConVenta);
                }
            });

            setVentasParaLlevar(paraLlevar);
            setVentasDelivery(delivery);
            setMesasActivas(mesasConVentas);
        } catch (error) {
            console.error('Error al cargar pedidos pendientes:', error);
            toast.error('Error al cargar pedidos');
        } finally {
            setLoading(false);
        }
    };

    const handlePrintPreCuenta = (widthMesa: boolean, items: (ItemCarrito | ItemVenta)[], total: number, orderId: string, mesaNumero?: number) => {
        setReceiptData({
            items,
            total,
            orderId,
            mesaNumero,
            title: 'ESTADO DE CUENTA'
        });
        setShowReceipt(true);
    };

    const marcarComoPagado = async (
        metodoPago: 'efectivo' | 'yape' | 'plin' | 'tarjeta' | 'mixto',
        pagoDividido?: { efectivo?: number; yape?: number; plin?: number; tarjeta?: number }
    ) => {
        if (!payModalData) return;
        const { ventaId, mesaId, mesaNumero, items, total } = payModalData;

        try {
            const updateData: any = {
                estado_pago: 'pagado',
                metodo_pago: metodoPago
            };
            if (pagoDividido) {
                updateData.pago_dividido = pagoDividido;
            }

            const { error } = await supabase
                .from('ventas')
                .update(updateData)
                .eq('id', ventaId);

            if (error) throw error;

            if (mesaId) {
                await supabase
                    .from('mesas')
                    .update({ estado: 'libre' })
                    .eq('id', mesaId);
            }

            setShowPayModal(false);
            setPayModalData(null);

            setReceiptData({
                items,
                total,
                orderId: ventaId,
                mesaNumero: mesaNumero,
                isNewSale: true
            });

            setShowReceipt(true);

            if (metodoPago === 'mixto' && pagoDividido) {
                const desglose = Object.entries(pagoDividido)
                    .filter(([, v]) => v && v > 0)
                    .map(([k, v]) => `${k}: S/${v?.toFixed(2)}`)
                    .join(' + ');
                toast.success(`Pago mixto: ${desglose}`, { icon: '💰', duration: 4000 });
            } else {
                toast.success(`Pago registrado (${metodoPago.toUpperCase()})`, { icon: '💰', duration: 3000 });
            }

            cargarPedidosPendientes();
        } catch (error) {
            console.error('Error al marcar como pagado:', error);
            toast.error('Error al procesar el pago');
        }
    };

    const handleCancelClick = (ventaId: string, mesaId: number | null, label: string) => {
        setCancelData({ ventaId, mesaId, label });
        setShowCancelModal(true);
    };

    const confirmCancel = async () => {
        if (!cancelData) return;
        try {
            const { error } = await supabase
                .from('ventas')
                .delete()
                .eq('id', cancelData.ventaId);

            if (error) throw error;

            if (cancelData.mesaId) {
                await supabase
                    .from('mesas')
                    .update({ estado: 'libre' })
                    .eq('id', cancelData.mesaId);
            }

            toast.success('Pedido eliminado — stock restaurado', { icon: '🗑️' });
            cargarPedidosPendientes();
        } catch (error) {
            console.error('Error al cancelar:', error);
            toast.error('Error al eliminar el pedido');
        } finally {
            setShowCancelModal(false);
            setCancelData(null);
        }
    };

    const totalPedidos = mesasActivas.length + ventasParaLlevar.length + ventasDelivery.length;

    return (
        <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-8 lg:p-12 pb-32">
            <div className="max-w-6xl mx-auto">
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <motion.h1
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic"
                        >
                            Caja y Cobros
                        </motion.h1>
                        <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-2 flex items-center gap-2 italic">
                            <span className="w-2 h-2 rounded-full bg-rodrigo-mustard animate-pulse"></span>
                            {totalPedidos} Comprobantes Pendientes
                        </p>
                    </div>
                </header>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-slate-100 border-t-rodrigo-mustard rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-rodrigo-mustard font-black text-xl animate-pulse">S/</span>
                            </div>
                        </div>
                        <p className="text-slate-300 font-black uppercase tracking-widest text-[10px]">Sincronizando caja...</p>
                    </div>
                ) : totalPedidos === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-32 bg-white rounded-[4rem] border-2 border-dashed border-slate-100 shadow-sm"
                    >
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 border border-slate-100 shadow-inner">
                            <Users size={40} className="text-slate-200" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight italic">¡Caja al día!</h3>
                        <p className="text-slate-400 text-xs max-w-[250px] mx-auto font-bold uppercase tracking-widest">No hay cuentas pendientes por cobrar en este momento.</p>
                    </motion.div>
                ) : (
                    <div className="space-y-16">
                        {/* Section PARA LLEVAR */}
                        {ventasParaLlevar.length > 0 && (
                            <section>
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 rounded-2xl bg-rodrigo-terracotta/10 border border-rodrigo-terracotta/20 flex items-center justify-center text-rodrigo-terracotta shadow-sm">
                                        <ShoppingBag size={24} />
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">Para Llevar</h2>
                                    <div className="h-px flex-1 bg-slate-100"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <AnimatePresence mode="popLayout">
                                        {ventasParaLlevar.map((venta, idx) => (
                                            <VentaCard
                                                key={venta.id}
                                                venta={venta}
                                                label="PARA LLEVAR"
                                                idx={idx}
                                                onPay={() => abrirModalCobro(venta.id, null, undefined, venta.items, venta.total)}
                                                onPrint={() => handlePrintPreCuenta(false, venta.items, venta.total, venta.id)}
                                                onCancel={() => handleCancelClick(venta.id, null, 'Para Llevar')}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </section>
                        )}

                        {/* Section DELIVERY */}
                        {ventasDelivery.length > 0 && (
                            <section>
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                                        <Navigation size={24} />
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">Delivery</h2>
                                    <div className="h-px flex-1 bg-slate-100"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <AnimatePresence mode="popLayout">
                                        {ventasDelivery.map((venta, idx) => (
                                            <VentaCard
                                                key={venta.id}
                                                venta={venta}
                                                label="DELIVERY"
                                                idx={idx}
                                                onPay={() => abrirModalCobro(venta.id, null, undefined, venta.items, venta.total)}
                                                onPrint={() => handlePrintPreCuenta(false, venta.items, venta.total, venta.id)}
                                                onCancel={() => handleCancelClick(venta.id, null, 'Delivery')}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </section>
                        )}

                        {/* Section MESAS */}
                        {mesasActivas.length > 0 && (
                            <section>
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shadow-sm">
                                        <Users size={24} />
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">Servicio en Comedor</h2>
                                    <div className="h-px flex-1 bg-slate-100"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <AnimatePresence mode="popLayout">
                                        {mesasActivas.map((mesa, idx) => (
                                            <VentaCard
                                                key={mesa.id}
                                                venta={mesa.venta!}
                                                label={`MESA ${mesa.numero}`}
                                                idx={idx}
                                                onPay={() => abrirModalCobro(mesa.venta!.id, mesa.id, mesa.numero, mesa.venta!.items, mesa.venta!.total)}
                                                onPrint={() => handlePrintPreCuenta(true, mesa.venta!.items, mesa.venta!.total, mesa.venta!.id, mesa.numero)}
                                                onCancel={() => handleCancelClick(mesa.venta!.id, mesa.id, `Mesa ${mesa.numero}`)}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </section>
                        )}
                    </div>
                )}

                {/* Modals */}
                <AnimatePresence>
                    {payModalData && (
                        <SplitPaymentModal
                            isOpen={showPayModal}
                            onClose={() => { setShowPayModal(false); setPayModalData(null); }}
                            total={payModalData.total}
                            onConfirm={marcarComoPagado}
                        />
                    )}
                </AnimatePresence>

                {receiptData && (
                    <ReceiptModal
                        isOpen={showReceipt}
                        onClose={() => setShowReceipt(false)}
                        items={receiptData.items}
                        total={receiptData.total}
                        orderId={receiptData.orderId}
                        mesaNumero={receiptData.mesaNumero}
                        title={receiptData.title}
                        isNewSale={receiptData.isNewSale}
                    />
                )}

                <AnimatePresence>
                    {showCancelModal && cancelData && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCancelModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="relative bg-white border border-slate-100 rounded-[3rem] p-8 w-full max-w-sm text-center shadow-2xl"
                            >
                                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-100">
                                    <AlertTriangle size={32} className="text-red-500" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight uppercase italic">Eliminar Pedido</h3>
                                <p className="text-slate-400 text-sm mb-8 font-bold uppercase tracking-widest italic">¿Está seguro de eliminar el pedido de <span className="text-slate-900">{cancelData.label}</span>? El stock será restaurado.</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowCancelModal(false)} className="flex-1 py-4 bg-slate-50 text-slate-400 font-black rounded-2xl hover:bg-slate-100 transition-all uppercase text-[10px] tracking-widest italic">Atrás</button>
                                    <button onClick={confirmCancel} className="flex-1 py-4 bg-rodrigo-terracotta text-white font-black rounded-2xl shadow-lg hover:brightness-110 active:scale-95 transition-all uppercase text-[10px] tracking-widest italic">Eliminar</button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function VentaCard({ venta, label, idx, onPay, onPrint, onCancel }: { venta: Venta, label: string, idx: number, onPay: () => void, onPrint: () => void, onCancel: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="group relative bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 hover:border-slate-200 transition-all duration-500 shadow-sm"
        >
            <div className="p-8 relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <span className="inline-block px-3 py-1 bg-slate-50 border border-slate-100 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                            {label}
                        </span>
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest italic">
                            <Clock size={14} className="text-rodrigo-mustard" />
                            {new Date(venta.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Por Cobrar</p>
                        <p className="text-3xl font-black text-slate-900 tracking-tighter italic">S/{(venta.total || 0).toFixed(2)}</p>
                    </div>
                </div>

                {/* Items Preview */}
                <div className="space-y-2.5 mb-8 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                    {venta.items.map((item, id) => (
                        <div key={id} className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-3">
                                <span className="w-5 h-5 flex items-center justify-center rounded bg-slate-50 border border-slate-100 text-[10px] font-black text-rodrigo-terracotta">
                                    {item.cantidad}
                                </span>
                                <span className="font-bold text-slate-700 uppercase truncate max-w-[140px] italic">{item.nombre}</span>
                            </div>
                            <span className="font-mono text-slate-300 text-[11px]">S/{(item.precio * item.cantidad).toFixed(2)}</span>
                        </div>
                    ))}
                    {venta.tipo_pedido === 'delivery' && (venta.costo_envio || 0) > 0 && (
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-50 border-dashed">
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 flex items-center justify-center rounded bg-indigo-50 border border-indigo-100">
                                    <Navigation size={10} className="text-indigo-500" />
                                </div>
                                <span className="font-bold text-indigo-500 uppercase italic">Costo de Envío</span>
                            </div>
                            <span className="font-mono text-indigo-400 text-[11px]">S/{venta.costo_envio?.toFixed(2)}</span>
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    <button
                        onClick={onPay}
                        className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 italic"
                    >
                        <CreditCard size={16} /> REGISTRAR PAGO
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={onPrint}
                            className="py-3 bg-slate-50 border border-slate-100 text-slate-400 font-black rounded-2xl hover:bg-slate-100 active:scale-95 transition-all text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 italic shadow-sm"
                        >
                            <Printer size={14} /> Ticket
                        </button>
                        <button
                            onClick={onCancel}
                            className="py-3 bg-slate-50 border border-slate-100 text-slate-300 hover:text-rodrigo-terracotta font-black rounded-2xl hover:bg-red-50 active:scale-95 transition-all text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 italic shadow-sm"
                        >
                            <Trash2 size={14} /> Anular
                        </button>
                    </div>
                </div>
            </div>

            {/* Border glow on hover */}
            <div className="absolute inset-x-0 bottom-0 h-1 bg-rodrigo-mustard transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 opacity-50"></div>
        </motion.div>
    );
}
