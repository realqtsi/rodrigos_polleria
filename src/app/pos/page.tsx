'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    UtensilsCrossed,
    ShoppingBag,
    Navigation2,
    ArrowRight,
    Search,
    X,
    Plus,
    Minus,
    Trash2,
    ClipboardList,
    RefreshCw,
    Activity,
    MapPin,
    AlertCircle,
    CheckCircle2,
    DollarSign,
    Clock,
    User,
    ChevronDown,
    Save
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Producto, ItemCarrito, Mesa } from '@/lib/database.types';
import { useInventario } from '@/hooks/useInventario';
import { useMesas } from '@/hooks/useMesas';
import { useEstadisticasProductos } from '@/hooks/useEstadisticasProductos';
import { registrarVenta, actualizarVenta } from '@/lib/ventas';
import ReceiptModal from '@/components/ReceiptModal';
import ProductOptionsModal from '@/components/ProductOptionsModal';
import dynamic from 'next/dynamic';
const DeliverySelector = dynamic(() => import('@/components/DeliverySelector'), {
    ssr: false,
});

export default function POSPage() {
    return (
        <ProtectedRoute>
            <POSContent />
        </ProtectedRoute>
    );
}

type Categoria = 'todos' | 'populares' | 'pollos' | 'combos' | 'promociones' | 'bebidas' | 'complementos' | 'especiales' | 'extras';

function POSContent() {
    const [view, setView] = useState<'start' | 'mesas' | 'pedido'>('start');
    const [productos, setProductos] = useState<Producto[]>([]);
    const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
    const [loading, setLoading] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [categoriaActiva, setCategoriaActiva] = useState<Categoria>('todos');
    const [searchTerm, setSearchTerm] = useState('');
    const { stock, refetch } = useInventario();

    // Hook para estadísticas de productos más vendidos
    const { topProductos } = useEstadisticasProductos();

    const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [showReceipt, setShowReceipt] = useState(false);
    const [receiptTitle, setReceiptTitle] = useState('BOLETA DE VENTA');
    const [lastSaleItems, setLastSaleItems] = useState<ItemCarrito[]>([]);
    const [lastSaleTotal, setLastSaleTotal] = useState(0);

    // Table management
    const [selectedTable, setSelectedTable] = useState<Mesa | null>(null);
    const [isParaLlevar, setIsParaLlevar] = useState(false);
    const [isDelivery, setIsDelivery] = useState(false);
    const [deliveryInfo, setDeliveryInfo] = useState<{ address: string; distanceKm: number; cost: number } | null>(null);
    const [showDeliveryMap, setShowDeliveryMap] = useState(false);
    const [showDeliveryRadar, setShowDeliveryRadar] = useState(false);
    const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'yape' | 'plin'>('efectivo');

    const { mesas, loading: loadingMesas, ocuparMesa, cambiarMesa, refetch: refetchMesas } = useMesas();
    const [currentVentaId, setCurrentVentaId] = useState<string | null>(null);
    const [showCambiarMesaModal, setShowCambiarMesaModal] = useState(false);

    // Order notes
    const [orderNotes, setOrderNotes] = useState('');

    // Custom item (producto libre)
    const [showCustomItem, setShowCustomItem] = useState(false);
    const [customItemName, setCustomItemName] = useState('');
    const [customItemPrice, setCustomItemPrice] = useState('');

    const cargarProductos = async () => {
        try {
            const { data, error } = await supabase
                .from('productos')
                .select('*')
                .eq('activo', true)
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

        // Suscripción en tiempo real para actualizar precios al instante
        const channel = supabase
            .channel('productos-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'productos' },
                () => { cargarProductos(); }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Suscripción a cambios en la venta actual (Prevención de conflictos)
    useEffect(() => {
        if (!currentVentaId) return;

        const channel = supabase
            .channel(`venta-${currentVentaId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'ventas', filter: `id=eq.${currentVentaId}` },
                (payload) => {
                    toast((t) => (
                        <div className="flex flex-col gap-2">
                            <span className="font-bold text-sm">⚠️ La orden ha sido modificada</span>
                            <span className="text-xs">Alguien más actualizó este pedido.</span>
                            <button
                                onClick={() => {
                                    if (selectedTable) handleTableClick(selectedTable);
                                    toast.dismiss(t.id);
                                }}
                                className="bg-rodrigo-terracotta text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-600 transition-colors"
                            >
                                🔄 Recargar Datos
                            </button>
                        </div>
                    ), { duration: 10000, position: 'top-right', id: 'update-conflict' });
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [currentVentaId, selectedTable]);

    const handleTableClick = async (mesa: Mesa | null) => {
        if (!mesa) {
            // Pedido para llevar
            setSelectedTable(null);
            setIsParaLlevar(true);
            setIsDelivery(false);
            setDeliveryInfo(null);
            setCurrentVentaId(null);
            if (view === 'mesas') setCarrito([]);
            setView('pedido');
            return;
        }

        setSelectedTable(mesa);
        setIsParaLlevar(false);
        setIsDelivery(false);
        setDeliveryInfo(null);

        if (mesa.estado === 'ocupada') {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('ventas')
                    .select('*')
                    .eq('mesa_id', mesa.id)
                    .eq('estado_pago', 'pendiente')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (data && !error) {
                    setCurrentVentaId(data.id);
                    const itemsPrevios: ItemCarrito[] = data.items.map((it: any) => ({
                        ...it,
                        subtotal: it.cantidad * it.precio,
                        printed: true
                    }));
                    setCarrito(itemsPrevios);
                    setOrderNotes(data.notes || '');
                    toast.success(`Cargando pedido actual de Mesa ${mesa.numero}`);
                } else {
                    setCurrentVentaId(null);
                    setCarrito([]);
                }
            } catch (err) {
                console.error('Error al cargar venta de mesa ocupada:', err);
                setCarrito([]);
            } finally {
                setLoading(false);
            }
        } else {
            setCurrentVentaId(null);
            if (view === 'mesas') {
                setCarrito([]);
                setOrderNotes('');
            }
        }
        setView('pedido');
    };

    const handleProductClick = (producto: Producto) => {
        setSelectedProduct(producto);
        setIsModalOpen(true);
    };

    const agregarAlCarrito = (producto: Producto, opciones: { parte?: string, trozado?: string, notas: string, detalle_bebida?: { marca: string, tipo: string }, cantidad?: number }) => {
        const itemKey = `${producto.id}-${opciones.parte || ''}-${opciones.notas || ''}`;
        const itemExistenteIndex = carrito.findIndex((item) => {
            const currentItemKey = `${item.producto_id}-${item.detalles?.parte || ''}-${item.detalles?.notas || ''}`;
            return currentItemKey === itemKey;
        });

        if (itemExistenteIndex >= 0 && !carrito[itemExistenteIndex].printed) {
            const nuevoCarrito = [...carrito];
            nuevoCarrito[itemExistenteIndex].cantidad += (opciones.cantidad || 1);
            nuevoCarrito[itemExistenteIndex].subtotal = nuevoCarrito[itemExistenteIndex].cantidad * nuevoCarrito[itemExistenteIndex].precio;
            setCarrito(nuevoCarrito);
        } else {
            let detalleBebida = opciones.detalle_bebida;
            const nuevoItem: ItemCarrito = {
                producto_id: producto.id,
                nombre: producto.nombre,
                cantidad: opciones.cantidad || 1,
                precio: producto.precio,
                fraccion_pollo: producto.fraccion_pollo,
                subtotal: producto.precio * (opciones.cantidad || 1),
                detalles: { parte: opciones.parte, trozado: opciones.trozado, notas: opciones.notas },
                detalle_bebida: opciones.detalle_bebida as any,
                tipo: producto.tipo
            };
            setCarrito([...carrito, nuevoItem]);
        }
    };

    const modificarCantidad = (index: number, delta: number) => {
        const nuevoCarrito = [...carrito];
        const item = nuevoCarrito[index];
        const nuevaCantidad = item.cantidad + delta;
        if (nuevaCantidad <= 0) {
            eliminarDelCarrito(index);
            return;
        }
        item.cantidad = nuevaCantidad;
        item.subtotal = nuevaCantidad * item.precio;
        setCarrito(nuevoCarrito);
    };

    const eliminarDelCarrito = (index: number) => {
        const nuevoCarrito = [...carrito];
        nuevoCarrito.splice(index, 1);
        setCarrito(nuevoCarrito);
    };

    const vaciarCarrito = () => {
        setCarrito([]);
        setSelectedTable(null);
        setIsParaLlevar(false);
        setIsDelivery(false);
        setDeliveryInfo(null);
        setView('mesas');
    };

    const calcularSubtotal = () => carrito.reduce((sum, item) => sum + item.subtotal, 0);
    const calcularTotal = () => {
        const subtotal = calcularSubtotal();
        return isDelivery && deliveryInfo ? subtotal + deliveryInfo.cost : subtotal;
    };

    const handleConfirmarPedido = async () => {
        if (carrito.length === 0) {
            toast.error('El carrito está vacío');
            return;
        }
        setProcesando(true);
        try {
            const tipo_pedido = isDelivery ? 'delivery' : (isParaLlevar ? 'llevar' : 'mesa');
            const deliveryData = isDelivery && deliveryInfo ? {
                tipo_pedido: 'delivery' as const,
                costo_envio: deliveryInfo.cost,
                direccion_envio: deliveryInfo.address,
                distancia_km: deliveryInfo.distanceKm,
                metodo_pago: metodoPago
            } : { tipo_pedido: tipo_pedido as any, metodo_pago: metodoPago };

            let resultado;
            if (currentVentaId) {
                resultado = await actualizarVenta(currentVentaId, carrito);
            } else {
                if (selectedTable) await ocuparMesa(selectedTable.id);
                resultado = await registrarVenta(carrito, selectedTable?.id, orderNotes, deliveryData);
            }

            if (resultado.success) {
                const itemsParaCocina = carrito.filter(item => !item.printed);
                if (itemsParaCocina.length > 0) {
                    try {
                        const { data: config } = await supabase.from('configuracion_negocio').select('ip_impresora_cocina, ip_impresora_caja').eq('id', 1).single();
                        const hostIp = window.location.hostname;
                        const printServerUrl = `http://${hostIp}:3001`;
                        await fetch(`${printServerUrl}/print-kitchen`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ip: config?.ip_impresora_cocina || '192.168.1.100', mesa: selectedTable ? selectedTable.numero : 'LLEVAR', items: itemsParaCocina, notas: orderNotes })
                        });
                        await fetch(`${printServerUrl}/print-receipt`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ip: config?.ip_impresora_caja || '192.168.1.101', items: itemsParaCocina, subtotal: calcularSubtotal(), total: calcularTotal(), envio: deliveryInfo?.cost || 0, esDelivery: isDelivery, direccion: deliveryInfo?.address })
                        });
                        toast.success('Impresión enviada correctamente 🖨️');
                    } catch (err) {
                        toast.error('Error al imprimir. Verifica el print-server.');
                    }
                }
                const audio = new Audio('/kitchen-bell.mp3');
                audio.play().catch(() => { });
                toast.success(resultado.message);
                setView('mesas');
                setCarrito([]);
                setOrderNotes('');
                refetch();
                refetchMesas();
            } else {
                toast.error(resultado.message);
            }
        } catch (error) {
            console.error('Error al confirmar pedido:', error);
            toast.error('Ocurrió un error inesperado');
        } finally {
            setProcesando(false);
        }
    };

    const handleEstadoCuenta = () => {
        setLastSaleItems(carrito);
        setLastSaleTotal(calcularTotal());
        setReceiptTitle('ESTADO DE CUENTA');
        setShowReceipt(true);
    };

    const categorias: { id: Categoria; nombre: string; emoji: string }[] = [
        { id: 'todos', nombre: 'Todos', emoji: '🍽️' },
        { id: 'populares', nombre: 'Populares', emoji: '🔥' },
        { id: 'promociones', nombre: 'Promos', emoji: '🎉' },
        { id: 'pollos', nombre: 'Pollos', emoji: '🍗' },
        { id: 'especiales', nombre: 'Especiales', emoji: '⭐' },
        { id: 'extras', nombre: 'Extras', emoji: '🍟' },
        { id: 'bebidas', nombre: 'Bebidas', emoji: '🥤' },
    ];

    const productosFiltrados = productos.filter(producto => {
        const matchSearch = searchTerm === '' ||
            producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (producto.descripcion && producto.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));
        if (!matchSearch) return false;
        if (categoriaActiva === 'todos') return true;
        if (categoriaActiva === 'populares') {
            const productosPopularesIds = topProductos.map((tp: any) => tp.producto_id);
            return productosPopularesIds.includes(producto.id);
        }
        if (categoriaActiva === 'pollos') return producto.tipo === 'pollo' && producto.fraccion_pollo > 0;
        if (categoriaActiva === 'especiales') {
            const nombresEspeciales = ['mostrito', 'mostrazo', 'chori', 'salchi', 'chaufa', 'anticucho', 'trilogía', 'cuarto'];
            return nombresEspeciales.some(nombre => producto.nombre.toLowerCase().includes(nombre));
        }
        if (categoriaActiva === 'promociones') return producto.tipo === 'promocion';
        if (categoriaActiva === 'extras') return producto.tipo === 'complemento';
        if (categoriaActiva === 'bebidas') return producto.tipo === 'bebida';
        return true;
    });

    // --- VISTAS ---

    if (view === 'start') {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-4">
                <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-3 gap-8">
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02, y: -5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setView('mesas')}
                        className="group relative bg-white p-10 rounded-4xl border-2 border-slate-100 shadow-xl flex flex-col items-center text-center transition-all hover:border-rodrigo-mustard/30 hover:shadow-2xl overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:bg-rodrigo-mustard/5 transition-colors duration-500"></div>
                        <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mb-8 rotate-3 shadow-sm border border-slate-100 group-hover:bg-white group-hover:rotate-0 transition-transform duration-500">
                            <UtensilsCrossed size={48} className="text-slate-400 group-hover:text-rodrigo-terracotta transition-colors" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-4">Salón</h2>
                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest leading-relaxed">Pedidos en mesa con atención personalizada</p>
                    </motion.button>

                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        whileHover={{ scale: 1.02, y: -5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleTableClick(null)}
                        className="group relative bg-white p-10 rounded-4xl border-2 border-slate-100 shadow-xl flex flex-col items-center text-center transition-all hover:border-rodrigo-mustard/30 hover:shadow-2xl overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:bg-rodrigo-mustard/5 transition-colors duration-500"></div>
                        <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mb-8 -rotate-3 shadow-sm border border-slate-100 group-hover:bg-white group-hover:rotate-0 transition-transform duration-500">
                            <ShoppingBag size={48} className="text-slate-400 group-hover:text-rodrigo-terracotta transition-colors" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-4">Llevar</h2>
                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest leading-relaxed">Recojo en local rápido y sin complicaciones</p>
                    </motion.button>

                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        whileHover={{ scale: 1.02, y: -5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                            setIsDelivery(true);
                            setView('pedido');
                            setShowDeliveryMap(true);
                        }}
                        className="group relative bg-white p-10 rounded-4xl border-2 border-slate-100 shadow-xl flex flex-col items-center text-center transition-all hover:border-rodrigo-mustard/30 hover:shadow-2xl overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:bg-rodrigo-mustard/5 transition-colors duration-500"></div>
                        <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mb-8 rotate-3 shadow-sm border border-slate-100 group-hover:bg-white group-hover:rotate-0 transition-transform duration-500">
                            <Navigation2 size={48} className="text-slate-400 group-hover:text-rodrigo-terracotta transition-colors" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-4">Delivery</h2>
                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest leading-relaxed">Envíos a domicilio con seguimiento en mapa</p>
                    </motion.button>
                </div>
            </div>
        );
    }

    if (view === 'mesas') {
        return (
            <div className="space-y-8 pb-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setView('start')} className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 shadow-sm"><ArrowRight className="rotate-180" size={24} /></button>
                        <div>
                            <h1 className="text-5xl font-black text-slate-900 italic tracking-tighter uppercase leading-none">Salón Principal</h1>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2 translate-x-4">Seleccionar mesa para iniciar pedido</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                    {mesas.map((mesa) => (
                        <motion.button
                            key={mesa.id}
                            onClick={() => handleTableClick(mesa)}
                            className={`relative aspect-square rounded-4xl flex flex-col items-center justify-center transition-all duration-300 group shadow-sm ${mesa.estado === 'libre' ? 'bg-white border border-slate-100' : 'bg-rodrigo-terracotta text-white'}`}
                        >
                            <span className="text-4xl font-black italic tracking-tighter">{mesa.numero}</span>
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] mt-2">{mesa.estado === 'libre' ? 'Libre' : 'Ocupada'}</span>
                        </motion.button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20 lg:pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => setView(isParaLlevar || isDelivery ? 'start' : 'mesas')} className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 shadow-sm"><ArrowRight className="rotate-180" size={20} /></button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 italic tracking-tight uppercase">
                            {isDelivery ? "Servicio Delivery" : isParaLlevar ? "Pedido Llevar" : `Mesa ${selectedTable?.numero}`}
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                    {categorias.map((cat) => (
                        <button key={cat.id} onClick={() => setCategoriaActiva(cat.id)} className={`px-5 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] border ${categoriaActiva === cat.id ? 'bg-rodrigo-terracotta text-white border-rodrigo-terracotta' : 'bg-white text-slate-400'}`}>{cat.nombre}</button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 space-y-6">
                    <div className="relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                        <input type="text" placeholder="BUSCAR PRODUCTO..." className="w-full bg-white border-2 border-slate-100 rounded-3xl py-5 pl-16 pr-8 text-sm font-bold text-slate-900 placeholder:text-slate-300 transition-all outline-none focus:border-rodrigo-mustard/30 shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6">
                        {productosFiltrados.map((producto) => (
                            <motion.button
                                key={producto.id}
                                onClick={() => handleProductClick(producto)}
                                className="group bg-white p-5 rounded-4xl border-2 border-slate-100 shadow-sm hover:border-rodrigo-mustard/30 hover:shadow-xl transition-all text-left flex flex-col items-center"
                            >
                                <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <UtensilsCrossed size={32} className="text-slate-300 group-hover:text-rodrigo-terracotta" />
                                </div>
                                <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tight text-center">{producto.nombre}</h3>
                                <p className="text-xs font-black text-rodrigo-terracotta mt-2 italic">S/ {producto.precio.toFixed(2)}</p>
                            </motion.button>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-4 sticky top-6">
                    <div className="bg-slate-900 rounded-4xl p-8 border border-white/5 shadow-2xl text-white">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black italic tracking-tighter uppercase">Carrito de Venta</h2>
                            <button onClick={vaciarCarrito} className="p-2 hover:text-red-400 transition-colors"><Trash2 size={20} /></button>
                        </div>

                        <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar-light mb-8">
                            {carrito.map((item, index) => (
                                <div key={index} className="flex items-center justify-between bg-white/5 p-4 rounded-3xl border border-white/5">
                                    <div className="flex-1">
                                        <h4 className="text-xs font-black uppercase tracking-tight italic">{item.nombre}</h4>
                                        <p className="text-[10px] text-white/50 font-bold uppercase mt-1">S/ {(item.cantidad * item.precio).toFixed(2)}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => modificarCantidad(index, -1)} className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20"><Minus size={14} /></button>
                                        <span className="text-xs font-black">{item.cantidad}</span>
                                        <button onClick={() => modificarCantidad(index, 1)} className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20"><Plus size={14} /></button>
                                    </div>
                                </div>
                            ))}
                            {carrito.length === 0 && (
                                <div className="py-20 text-center opacity-20"><ShoppingBag className="mx-auto mb-4" size={48} /><p className="text-xs font-black uppercase tracking-widest">Carrito Vacío</p></div>
                            )}
                        </div>

                        <div className="space-y-3 pt-6 border-t border-white/10">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-white/50"><span>Subtotal</span><span>S/ {calcularSubtotal().toFixed(2)}</span></div>
                            {isDelivery && deliveryInfo && <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-white/50"><span>Envío</span><span>S/ {deliveryInfo.cost.toFixed(2)}</span></div>}
                            <div className="flex justify-between text-2xl font-black italic tracking-tighter text-rodrigo-mustard pt-2"><span>Total</span><span>S/ {calcularTotal().toFixed(2)}</span></div>
                        </div>

                        <button onClick={handleConfirmarPedido} disabled={procesando || carrito.length === 0} className="w-full bg-rodrigo-terracotta hover:bg-red-600 disabled:bg-stone-800 text-white rounded-3xl py-5 mt-8 font-black uppercase italic tracking-widest shadow-xl shadow-rodrigo-terracotta/20 transition-all flex items-center justify-center gap-3">{procesando ? 'Procesando...' : (currentVentaId ? 'Actualizar Pedido' : 'Confirmar Pedido')}<CheckCircle2 size={24} /></button>
                    </div>
                </div>
            </div>

            <ProductOptionsModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSelectedProduct(null); }}
                producto={selectedProduct}
                onConfirm={(producto, opciones) => { agregarAlCarrito(producto, opciones); setIsModalOpen(false); setSelectedProduct(null); }}
            />

            <AnimatePresence>
                {showReceipt && (
                    <ReceiptModal
                        isOpen={showReceipt}
                        onClose={() => setShowReceipt(false)}
                        items={lastSaleItems}
                        total={lastSaleTotal}
                        mesaNumero={selectedTable ? selectedTable.numero : undefined}
                        title={receiptTitle}
                        isNewSale={currentVentaId === null}
                    />
                )}
            </AnimatePresence>

            <DeliverySelector
                isOpen={showDeliveryMap}
                onClose={() => setShowDeliveryMap(false)}
                onConfirm={(address, distanceKm, cost) => {
                    setDeliveryInfo({ address, distanceKm, cost });
                    setIsDelivery(true);
                    setIsParaLlevar(false);
                    setSelectedTable(null);
                    setShowDeliveryMap(false);
                    setView('pedido');
                }}
            />
        </div>
    );
}
