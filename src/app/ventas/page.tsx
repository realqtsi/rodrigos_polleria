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
import { useAuth } from '@/contexts/AuthContext';

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
    const { user } = useAuth();
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
                    <div className="space-y-10">
                        {ventasParaLlevar.length > 0 && (
                            <section>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                                        <ShoppingBag size={16} className="text-amber-600" />
                                    </div>
                                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Para Llevar</h2>
                                    <span className="text-xs font-bold text-slate-400">({ventasParaLlevar.length})</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    <AnimatePresence mode="popLayout">
                                        {ventasParaLlevar.map((venta, idx) => (
                                            <VentaCard
                                                key={venta.id}
                                                venta={venta}
                                                label="LLEVAR"
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

                        {ventasDelivery.length > 0 && (
                            <section>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
                                        <Navigation size={16} className="text-indigo-600" />
                                    </div>
                                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Delivery</h2>
                                    <span className="text-xs font-bold text-slate-400">({ventasDelivery.length})</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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

                        {mesasActivas.length > 0 && (
                            <section>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center">
                                        <Users size={16} className="text-sky-600" />
                                    </div>
                                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Mesas</h2>
                                    <span className="text-xs font-bold text-slate-400">({mesasActivas.length})</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
    const { user } = useAuth();
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md hover:border-slate-200 transition-all"
        >
            <div className="flex justify-between items-start mb-3">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${label.includes('MESA') ? 'bg-sky-100 text-sky-600' : label === 'DELIVERY' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                    {label}
                </span>
                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(venta.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
            <div className="text-right mb-4">
                <p className="text-3xl font-black text-slate-900 tracking-tighter">S/{(venta.total || 0).toFixed(2)}</p>
            </div>
            <div className="space-y-2 mb-6 max-h-64 overflow-y-auto pr-2 bg-slate-50/50 p-2 rounded-xl border border-slate-50">
                {venta.items.map((item, id) => (
                    <div key={id} className="flex items-center gap-3 text-sm border-b border-slate-100/50 last:border-0 pb-1.5 last:pb-0">
                        <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-white shadow-sm border border-slate-100 text-[12px] font-black text-slate-900">{item.cantidad}</span>
                        <div className="flex-1 min-w-0">
                            <span className="text-slate-900 font-bold block truncate">{item.nombre}</span>
                            {(item as any).detalles?.notas && (
                                <span className="text-[10px] text-rodrigo-terracotta font-black uppercase italic block">
                                    Nota: {(item as any).detalles.notas}
                                </span>
                            )}
                        </div>
                        <span className="text-slate-500 font-black text-xs whitespace-nowrap">S/{(item.precio * item.cantidad).toFixed(2)}</span>
                    </div>
                ))}
            </div>
            <div className="flex gap-3">
                {(user?.rol === 'admin' || user?.rol === 'cajero') && (
                    <button onClick={onPay} className="flex-1 py-4 bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200">
                        <CreditCard size={14} /> COBRAR
                    </button>
                )}
                <button onClick={onPrint} className={`py-4 px-4 bg-white border-2 border-slate-100 text-slate-600 font-black text-[11px] uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all shadow-sm ${user?.rol === 'mozo' ? 'flex-1' : ''}`}>
                    <Printer size={16} /> {(user?.rol === 'mozo' || !onPay) && ' IMPRIMIR'}
                </button>
                {(user?.rol === 'admin' || user?.rol === 'cajero') && (
                    <button onClick={onCancel} className="py-4 px-4 bg-white border-2 border-slate-100 text-red-500 font-black text-[11px] uppercase tracking-widest rounded-2xl hover:bg-red-50 hover:border-red-100 transition-all shadow-sm">
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
        </motion.div>
    );
}
