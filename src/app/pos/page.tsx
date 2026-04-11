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
    const [receiptTitle, setReceiptTitle] = useState('Comprobante');
    const [lastSaleItems, setLastSaleItems] = useState<ItemCarrito[]>([]);
    const [lastSaleTotal, setLastSaleTotal] = useState(0);

    // Mobile specific
    const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

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
                <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02, y: -5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setView('mesas')}
                        className="group relative bg-white p-6 md:p-10 rounded-[2rem] md:rounded-4xl border-2 border-slate-100 shadow-xl flex flex-row md:flex-col items-center text-left md:text-center transition-all hover:border-rodrigo-mustard/30 hover:shadow-2xl overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-slate-50 rounded-full -mr-12 -mt-12 md:-mr-16 md:-mt-16 group-hover:bg-rodrigo-mustard/5 transition-colors duration-500"></div>
                        <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-50 rounded-2xl md:rounded-3xl flex items-center justify-center mb-0 md:mb-8 mr-6 md:mr-0 rotate-3 shadow-sm border border-slate-100 group-hover:bg-white group-hover:rotate-0 transition-transform duration-500 shrink-0">
                            <UtensilsCrossed size={32} className="md:w-12 md:h-12 text-slate-400 group-hover:text-rodrigo-terracotta transition-colors" />
                        </div>
                        <div className="relative z-10">
                            <h2 className="text-xl md:text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-1 md:mb-4">Salón</h2>
                            <p className="text-slate-400 text-[10px] md:text-sm font-bold uppercase tracking-widest leading-none md:leading-relaxed">Pedidos en mesa</p>
                        </div>
                    </motion.button>

                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        whileHover={{ scale: 1.02, y: -5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleTableClick(null)}
                        className="group relative bg-white p-6 md:p-10 rounded-[2rem] md:rounded-4xl border-2 border-slate-100 shadow-xl flex flex-row md:flex-col items-center text-left md:text-center transition-all hover:border-rodrigo-mustard/30 hover:shadow-2xl overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-slate-50 rounded-full -mr-12 -mt-12 md:-mr-16 md:-mt-16 group-hover:bg-rodrigo-mustard/5 transition-colors duration-500"></div>
                        <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-50 rounded-2xl md:rounded-3xl flex items-center justify-center mb-0 md:mb-8 mr-6 md:mr-0 -rotate-3 shadow-sm border border-slate-100 group-hover:bg-white group-hover:rotate-0 transition-transform duration-500 shrink-0">
                            <ShoppingBag size={32} className="md:w-12 md:h-12 text-slate-400 group-hover:text-rodrigo-terracotta transition-colors" />
                        </div>
                        <div className="relative z-10">
                            <h2 className="text-xl md:text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-1 md:mb-4">Llevar</h2>
                            <p className="text-slate-400 text-[10px] md:text-sm font-bold uppercase tracking-widest leading-none md:leading-relaxed">Recojo en local</p>
                        </div>
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
                        className="group relative bg-white p-6 md:p-10 rounded-[2rem] md:rounded-4xl border-2 border-slate-100 shadow-xl flex flex-row md:flex-col items-center text-left md:text-center transition-all hover:border-rodrigo-mustard/30 hover:shadow-2xl overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-slate-50 rounded-full -mr-12 -mt-12 md:-mr-16 md:-mt-16 group-hover:bg-rodrigo-mustard/5 transition-colors duration-500"></div>
                        <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-50 rounded-2xl md:rounded-3xl flex items-center justify-center mb-0 md:mb-8 mr-6 md:mr-0 rotate-3 shadow-sm border border-slate-100 group-hover:bg-white group-hover:rotate-0 transition-transform duration-500 shrink-0">
                            <Navigation2 size={32} className="md:w-12 md:h-12 text-slate-400 group-hover:text-rodrigo-terracotta transition-colors" />
                        </div>
                        <div className="relative z-10">
                            <h2 className="text-xl md:text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-1 md:mb-4">Delivery</h2>
                            <p className="text-slate-400 text-[10px] md:text-sm font-bold uppercase tracking-widest leading-none md:leading-relaxed">Envíos a casa</p>
                        </div>
                    </motion.button>
                </div>
            </div>
        );
    }

    if (view === 'mesas') {
        return (
            <div className="space-y-4 md:space-y-8 pb-32">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                    <div className="flex items-center gap-3 md:gap-4">
                        <button onClick={() => setView('start')} className="w-10 h-10 md:w-12 md:h-12 bg-white border border-slate-100 rounded-xl md:rounded-2xl flex items-center justify-center text-slate-400 shadow-sm"><ArrowRight className="rotate-180" size={20} /></button>
                        <div>
                            <h1 className="text-2xl md:text-5xl font-black text-slate-900 italic tracking-tighter uppercase leading-none">Salón Principal</h1>
                            <p className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] mt-1 md:mt-2">Selecciona una mesa</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
                    {mesas.map((mesa) => (
                        <motion.button
                            key={mesa.id}
                            onClick={() => handleTableClick(mesa)}
                            className={`relative aspect-square rounded-[1.5rem] md:rounded-4xl flex flex-col items-center justify-center transition-all duration-300 group shadow-sm ${mesa.estado === 'libre' ? 'bg-white border border-slate-100' : 'bg-rodrigo-terracotta text-white'}`}
                        >
                            <span className="text-2xl md:text-4xl font-black italic tracking-tighter">{mesa.numero}</span>
                            <span className="text-[7px] md:text-[9px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] mt-1 md:mt-2">{mesa.estado === 'libre' ? 'Libre' : 'Ocupada'}</span>
                        </motion.button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 md:space-y-6 pb-32">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                    <button onClick={() => setView(isParaLlevar || isDelivery ? 'start' : 'mesas')} className="w-10 h-10 md:w-12 md:h-12 bg-white border border-slate-200 rounded-xl md:rounded-2xl flex items-center justify-center text-slate-400 shadow-sm"><ArrowRight className="rotate-180" size={18} /></button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-slate-900 italic tracking-tight uppercase">
                            {isDelivery ? "Delivery" : isParaLlevar ? "Recojo" : `Mesa ${selectedTable?.numero}`}
                        </h1>
                    </div>
                </div>
                <nav className="flex items-center gap-2 overflow-x-auto pb-4 md:pb-0 no-scrollbar touch-pan-x">
                    {categorias.map((cat) => (
                        <button key={cat.id} onClick={() => setCategoriaActiva(cat.id)} className={`whitespace-nowrap px-4 md:px-5 py-2.5 md:py-3 rounded-xl font-black uppercase tracking-widest text-[9px] md:text-[10px] border transition-all ${categoriaActiva === cat.id ? 'bg-rodrigo-terracotta text-white border-rodrigo-terracotta shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}>{cat.nombre}</button>
                    ))}
                </nav>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
                <div className="lg:col-span-8 space-y-6">
                    <div className="relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input type="text" placeholder="BUSCAR PRODUCTO..." className="w-full bg-white border-2 border-slate-100 rounded-[2rem] md:rounded-3xl py-4 md:py-5 pl-14 md:pl-16 pr-8 text-sm md:text-md font-bold text-slate-900 placeholder:text-slate-300 transition-all outline-none focus:border-rodrigo-mustard/30 shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                        {productosFiltrados.map((producto) => (
                            <motion.button
                                key={producto.id}
                                onClick={() => handleProductClick(producto)}
                                className="group bg-white p-4 md:p-5 rounded-[1.5rem] md:rounded-4xl border-2 border-slate-100 shadow-sm hover:border-rodrigo-mustard/30 hover:shadow-xl transition-all text-left flex flex-col items-center"
                            >
                                <div className="w-14 h-14 md:w-20 md:h-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform">
                                    <UtensilsCrossed size={24} className="md:w-8 md:h-8 text-slate-300 group-hover:text-rodrigo-terracotta" />
                                </div>
                                <h3 className="text-[10px] md:text-sm font-black text-slate-900 uppercase italic tracking-tight text-center leading-tight line-clamp-2">{producto.nombre}</h3>
                                <p className="text-[11px] md:text-xs font-black text-rodrigo-terracotta mt-1 md:mt-2 italic">S/ {producto.precio.toFixed(2)}</p>
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* Carrito (Desktop Sidebar) */}
                <div className="hidden lg:block lg:col-span-4 sticky top-6">
                    <CartPanel 
                        carrito={carrito} 
                        vaciarCarrito={vaciarCarrito} 
                        modificarCantidad={modificarCantidad} 
                        calcularSubtotal={calcularSubtotal}
                        calcularTotal={calcularTotal}
                        isDelivery={isDelivery}
                        deliveryInfo={deliveryInfo}
                        handleConfirmarPedido={handleConfirmarPedido}
                        procesando={procesando}
                        currentVentaId={currentVentaId}
                    />
                </div>
            </div>

            {/* Mobile Bottom Cart Bar */}
            <AnimatePresence>
                {carrito.length > 0 && (
                    <motion.div 
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        exit={{ y: 100 }}
                        className="lg:hidden fixed bottom-24 left-4 right-4 z-50 bg-slate-900 text-white rounded-[2rem] shadow-2xl overflow-hidden border border-white/10"
                    >
                        <button 
                            onClick={() => setIsCartDrawerOpen(true)}
                            className="w-full flex items-center justify-between p-5 active:bg-slate-800 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-rodrigo-terracotta rounded-xl flex items-center justify-center shadow-lg shadow-rodrigo-terracotta/20">
                                    <ShoppingBag size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest leading-none mb-1">Tu Pedido</p>
                                    <p className="text-lg font-black italic tracking-tighter leading-none">{carrito.length} {carrito.length === 1 ? 'Item' : 'Items'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-rodrigo-mustard font-black uppercase tracking-widest leading-none mb-1">Total</p>
                                <p className="text-2xl font-black italic tracking-tighter text-rodrigo-mustard leading-none">S/ {calcularTotal().toFixed(2)}</p>
                            </div>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Cart Drawer */}
            <AnimatePresence>
                {isCartDrawerOpen && (
                    <div className="lg:hidden fixed inset-0 z-[60] flex flex-col">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCartDrawerOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="mt-auto bg-slate-900 rounded-t-[3rem] p-8 border-t border-white/10 relative z-10 max-h-[85vh] overflow-y-auto"
                        >
                            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white">Revisar Pedido</h2>
                                <button onClick={() => setIsCartDrawerOpen(false)} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/50"><X size={24} /></button>
                            </div>

                            <CartPanel 
                                carrito={carrito} 
                                vaciarCarrito={vaciarCarrito} 
                                modificarCantidad={modificarCantidad} 
                                calcularSubtotal={calcularSubtotal}
                                calcularTotal={calcularTotal}
                                isDelivery={isDelivery}
                                deliveryInfo={deliveryInfo}
                                handleConfirmarPedido={() => {
                                    handleConfirmarPedido();
                                    setIsCartDrawerOpen(false);
                                }}
                                procesando={procesando}
                                currentVentaId={currentVentaId}
                                isMobileDrawer
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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
