import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, X, CheckCircle, Receipt, Search, User, RefreshCw, Trash2 } from 'lucide-react';
import type { ItemCarrito, ItemVenta } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { consultarDNI, consultarRUC } from '@/services/apiPeruService';
import toast from 'react-hot-toast';

interface ReceiptModalProps {

    isOpen: boolean;
    onClose: () => void;
    items: (ItemCarrito | ItemVenta)[];
    total: number;
    orderId?: string;
    mesaNumero?: number;
    title?: string;
    isNewSale?: boolean; // Prop to control counter increment
}

interface ConfigNegocio {
    id?: number;
    ruc: string;
    razon_social: string;
    direccion: string;
    telefono: string;
    mensaje_boleta: string;
    serie_boleta: string;
    numero_correlativo: number;
    serie_ticket?: string;
    numero_ticket?: number;
    ciudad?: string;
}

export default function ReceiptModal({ isOpen, onClose, items, total, orderId, mesaNumero, title = 'BOLETA DE VENTA', isNewSale = false }: ReceiptModalProps) {
    const [config, setConfig] = useState<ConfigNegocio>({
        ruc: '',
        razon_social: "Rodrigo's - Brasas & Broasters CHICKEN",
        direccion: '',
        telefono: '',
        mensaje_boleta: '¡Gracias por su preferencia!',
        serie_boleta: 'B001',
        numero_correlativo: 1,
        serie_ticket: 'TK001',
        numero_ticket: 1
    });

    const [numeroBoleta, setNumeroBoleta] = useState('');
    const [tipoComprobante, setTipoComprobante] = useState<'boleta' | 'ticket'>('ticket');
    const [serieTicket, setSerieTicket] = useState('TK001');
    const [numeroTicket, setNumeroTicket] = useState('');
    const [documento, setDocumento] = useState('');
    const [clienteNombre, setClienteNombre] = useState('');
    const [clienteDireccion, setClienteDireccion] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [errorDocumento, setErrorDocumento] = useState<string | null>(null);
    const [yaImpreso, setYaImpreso] = useState(false); // Evita sumar múltiple si le dan 2 veces a imprimir

    useEffect(() => {
        if (isOpen) {
            setClienteNombre('');
            setClienteDireccion('');
            setErrorDocumento(null);
            setYaImpreso(false);
            setTipoComprobante('ticket');
            cargarConfiguracion('ticket');
        }
    }, [isOpen, title]);

    const cargarConfiguracion = async (tipoOverride?: 'boleta' | 'ticket') => {
        try {
            const tipoFinal = tipoOverride || tipoComprobante;
            const { data } = await supabase
                .from('configuracion_negocio')
                .select('*')
                .limit(1)
                .single();

            if (data) {
                setConfig(data);

                if (tipoFinal === 'boleta') {
                    const numero = String(data.numero_correlativo + 1).padStart(8, '0');
                    setNumeroBoleta(`${data.serie_boleta}-${numero}`);
                } else {
                    const serieT = data.serie_ticket || 'T001';
                    const numT = String((data.numero_ticket || 0) + 1).padStart(6, '0');
                    setSerieTicket(serieT);
                    setNumeroTicket(`${serieT}-${numT}`);
                }
            }
        } catch (error) {
            console.error('Error al cargar configuración:', error);
        }
    };
    const handleDocumentSearch = async () => {
        if (documento.length !== 8 && documento.length !== 11) {
            setErrorDocumento('El documento debe tener 8 (DNI) u 11 (RUC) dígitos');
            return;
        }

        setIsSearching(true);
        setErrorDocumento(null);

        try {
            const isRUC = documento.length === 11;
            const response = isRUC ? await consultarRUC(documento) : await consultarDNI(documento);

            if (response.success && response.data) {
                setClienteNombre(response.data.nombre_completo || response.data.razon_social || '');
                const d = response.data as any;
                let dir = d.direccion_completa || d.direccion || '';
                if (d.distrito && d.provincia && d.departamento && dir) {
                    dir += ` - ${d.distrito} - ${d.provincia} - ${d.departamento}`;
                }
                setClienteDireccion(dir);
            } else {
                setErrorDocumento(response.message || `No se encontró el ${isRUC ? 'RUC' : 'DNI'}`);
                setClienteNombre('');
                setClienteDireccion('');
            }
        } catch (error) {
            setErrorDocumento('Error al consultar el documento');
            setClienteNombre('');
        } finally {
            setIsSearching(false);
        }
    };

    const clearClientData = () => {
        setDocumento('');
        setClienteNombre('');
        setClienteDireccion('');
        setErrorDocumento(null);
    };

    const imprimirUSB = async () => {
        try {
            const printServerUrl = `http://localhost:3001`; // Siempre apuntar a localhost para el Bridge local

            const response = await fetch(`${printServerUrl}/print-receipt-usb`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items,
                    total,
                    subtotal: total, // Asumido igual si no hay desglose aquí
                    envio: 0,
                    esDelivery: false,
                    title: title,
                    mesa: mesaNumero
                })
            });

            const result = await response.json();
            if (result.success) {
                toast.success('Impresión automática USB enviada 🖨️');
            } else {
                console.warn('Error en impresión USB:', result.message);
                // No lanzamos toast de error para no confundir si el bridge no está abierto, 
                // el usuario aún tiene el botón de imprimir manual del navegador.
            }
        } catch (e) {
            console.error('No se pudo conectar con el bridge de impresión:', e);
        }
    };

    const handlePrint = async () => {
        // 1. Validar si debe incrementar correlativo
        const esPreCuenta = title === 'ESTADO DE CUENTA';
        const debeIncrementar = isNewSale && !esPreCuenta && !yaImpreso;

        if (debeIncrementar) {
            try {
                // Fetch fresh config logic to avoid race conditions
                const { data: freshConfig, error: fetchError } = await supabase
                    .from('configuracion_negocio')
                    .select('*')
                    .limit(1)
                    .single();

                if (!fetchError && freshConfig) {
                    const updateData: any = {};

                    if (tipoComprobante === 'boleta') {
                        updateData.numero_correlativo = (freshConfig.numero_correlativo || 0) + 1;
                        const { error: updateError } = await supabase
                            .from('configuracion_negocio')
                            .update(updateData)
                            .eq('id', freshConfig.id);

                        if (!updateError) {
                            setYaImpreso(true);
                            await cargarConfiguracion();
                        }
                    } else {
                        setYaImpreso(true);
                    }
                }
            } catch (err) {
                console.error("Error inesperado al actualizar correlativo:", err);
            }
        }

        // 2. Intentar impresión directa vía USB (Bridge)
        imprimirUSB();

        // 3. Ya NO llamamos a window.print() automáticamente para evitar el cuadro de diálogo
        // window.print();
    };

    // Auto-impresión al abrir el modal si es una venta o pre-cuenta nueva
    useEffect(() => {
        if (isOpen) {
            // Pequeño delay para asegurar que el bridge esté listo o el modal cargado
            const timer = setTimeout(() => {
                imprimirUSB();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const fecha = new Date();
    const fechaFormateada = fecha.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    const horaFormateada = fecha.toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit'
    });

    // Portal para el ticket de impresión
    const printTicketContent = (
        <div className="hidden print:block print-ticket">
            {/* Encabezado del negocio */}
            <div className="ticket-header" style={{ textAlign: 'center' }}>
                <p className="negocio-nombre" style={{ marginBottom: '2px', fontWeight: 'bold', fontSize: '14px' }}>{config.razon_social}</p>
                <div className="negocio-info" style={{ marginTop: 0, fontSize: '10px' }}>
                    <p>{config.direccion || 'JR. HUASCAR 422'}</p>
                    <p>AYACUCHO - HUAMANGA</p>
                    <p style={{ marginTop: '4px', fontWeight: 'bold' }}>RUC: {config.ruc || '10700899948'}</p>
                    {config.telefono && <p>TEL: {config.telefono}</p>}
                </div>
            </div>

            {/* Número de ticket */}
            <div className="ticket-boleta-num" style={{ textAlign: 'center', marginTop: '8px' }}>
                <p style={{ fontWeight: 'bold', fontSize: '12px', textDecoration: 'underline' }}>TICKET DE CONTROL INTERNO</p>
                <p style={{ fontWeight: 'bold', fontSize: '14px' }}>{numeroTicket}</p>
            </div>

            {/* Fecha, hora, mesa */}
            <div className="ticket-meta" style={{ marginTop: '8px' }}>
                <div className="ticket-meta-row" style={{ fontSize: '10px' }}>
                    <span>FECHA: {fechaFormateada}</span>
                    <span>HORA: {horaFormateada}</span>
                </div>
            </div>
            {mesaNumero && (
                <div className="ticket-mesa" style={{ fontSize: '10px', textAlign: 'center', marginTop: '4px' }}>
                    <strong>MESA: {mesaNumero}</strong>
                </div>
            )}

            {/* Cabecera de items */}
            <div className="ticket-items-header" style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '8px', borderTop: '1px solid black', borderBottom: '1px solid black', padding: '4px 0' }}>
                <span>CANT  DESCRIPCIÓN</span>
                <span>TOTAL</span>
            </div>

            {/* Items de venta */}
            <div style={{ fontSize: '10px' }}>
                {items.map((item, idx) => {
                    const cantidad = Number(item.cantidad) || 0;
                    const precio = Number(item.precio) || 0;
                    const subtotal = Number((item as any).subtotal) || (cantidad * precio);
                        return (
                            <div key={idx} className="ticket-item" style={{ display: 'flex', flexDirection: 'column', padding: '2px 0', borderBottom: '1px dashed #eee' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span className="item-cantidad" style={{ fontWeight: 'bold' }}>{cantidad} x </span>
                                    <span className="item-nombre" style={{ flex: 1, marginLeft: '4px', fontWeight: 'bold' }}>{item.nombre?.toUpperCase()}</span>
                                    <span className="item-precio" style={{ whiteSpace: 'nowrap', marginLeft: '8px', fontWeight: 'bold' }}>S/ {subtotal.toFixed(2)}</span>
                                </div>
                                <div style={{ marginLeft: '24px', fontSize: '9px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {(item as any).detalles?.parte && (
                                        <span>PRESA: {(item as any).detalles.parte.toUpperCase()}</span>
                                    )}
                                    {(item as any).detalles?.trozado && (item as any).detalles.trozado !== 'entero' && (
                                        <span> / {(item as any).detalles.trozado.toUpperCase()}</span>
                                    )}
                                </div>
                                {(item as any).detalles?.notas && (
                                    <div style={{ marginLeft: '24px', fontSize: '9px', fontStyle: 'italic', color: '#666' }}>
                                        Nota: {(item as any).detalles.notas}
                                    </div>
                                )}
                            </div>
                        );
                })}
            </div>

            {/* Total */}
            <div className="ticket-total-box" style={{ marginTop: '8px', borderTop: '2px solid black', paddingTop: '8px' }}>
                <div className="ticket-total-row" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px' }}>
                    <span className="ticket-total-label">TOTAL A PAGAR:</span>
                    <span className="ticket-total-amount">S/ {total.toFixed(2)}</span>
                </div>
            </div>

            {/* Footer */}
            <div className="ticket-footer" style={{ marginTop: '16px', textAlign: 'center', fontSize: '10px' }}>
                <p className="footer-mensaje">"{config.mensaje_boleta}"</p>
                <p className="footer-sistema" style={{ marginTop: '8px', fontSize: '9px' }}>Rodrigo's - Brasas & Broasters CHICKEN</p>
            </div>
        </div>
    );

    // Renderizar el portal solo en el cliente
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:hidden">

                    {/* Contenedor Principal (Visible en Pantalla) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[96vh]"
                    >
                        {/* Header Visual */}
                        <div className="bg-rodrigo-terracotta text-white p-4 text-center">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-1 p-1.5 shadow-lg">
                                <img src="/images/logo-rodrigos.jpeg" alt="Logo" className="w-full h-full object-contain" />
                            </div>

                            <h2 className="text-lg font-bold">TICKET DE CONTROL INTERNO</h2>
                            <p className="text-white/80 text-xs font-mono">
                                {numeroTicket}
                            </p>
                        </div>

                        {/* Sección de Cliente / DNI */}
                        <div className="p-4 bg-gray-50 border-b border-gray-100">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Identificación del Cliente (Opcional)</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            value={documento}
                                            onChange={(e) => setDocumento(e.target.value.replace(/\D/g, '').slice(0, 11))}
                                            placeholder="DNI (8) o RUC (11)"
                                            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rodrigo-terracotta/20 focus:border-rodrigo-terracotta transition-all"
                                        />
                                        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                    </div>
                                    <button
                                        onClick={handleDocumentSearch}
                                        disabled={isSearching || (documento.length !== 8 && documento.length !== 11)}
                                        className="bg-rodrigo-mustard hover:bg-yellow-500 disabled:bg-gray-200 text-rodrigo-terracotta font-bold px-3 py-2 rounded-xl text-xs transition-colors flex items-center gap-1 min-w-[90px] justify-center"
                                    >
                                        {isSearching ? <RefreshCw className="animate-spin" size={14} /> : 'Consultar'}
                                    </button>
                                    {(documento || clienteNombre) && (
                                        <button
                                            onClick={clearClientData}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded-xl"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>

                                {errorDocumento && <p className="text-[10px] text-red-500 ml-1 font-medium">{errorDocumento}</p>}

                                {clienteNombre && (
                                    <>
                                        <motion.div
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-white p-2 rounded-xl border border-green-100 flex items-center gap-2"
                                        >
                                            <div className="bg-green-100 text-green-600 p-1.5 rounded-lg">
                                                <User size={14} />
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="text-[10px] text-gray-500 leading-none mb-0.5">Nombre Registrado:</p>
                                                <p className="text-[11px] font-bold text-gray-800 truncate uppercase">{clienteNombre}</p>
                                            </div>
                                        </motion.div>

                                        <motion.div
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-1"
                                        >
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1 mb-1 block">Dirección (Opcional)</label>
                                            <input
                                                type="text"
                                                value={clienteDireccion}
                                                onChange={(e) => setClienteDireccion(e.target.value)}
                                                placeholder="Ej. Av. Principal 123"
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rodrigo-terracotta/20 focus:border-rodrigo-terracotta transition-all"
                                            />
                                        </motion.div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Vista Previa del Ticket en Pantalla */}
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
                            <div className="bg-white shadow-sm border border-gray-200 p-5 rounded-xl text-[13px] font-mono text-gray-700">
                                <div className="text-center pb-3 mb-3 border-b-2 border-black">
                                    <p className="font-black text-xl text-black leading-tight mb-1 uppercase tracking-tighter">{config.razon_social}</p>
                                    <div className="space-y-0.5 text-[10px] text-gray-500 font-bold uppercase">
                                        <p className="leading-tight">{config.direccion || 'JR. HUASCAR 422'}</p>
                                        <p className="leading-tight">{config.ciudad || 'AYACUCHO - HUAMANGA'}</p>
                                        <p className="text-black pt-1">RUC: {config.ruc || '10700899948'}</p>
                                        {config.telefono && <p>TEL: {config.telefono}</p>}
                                    </div>
                                    <div className="mt-3 pt-2 border-t border-gray-100">
                                        <p className="font-black text-base text-rodrigo-terracotta tracking-widest">
                                            {numeroTicket}
                                        </p>
                                        <p className="text-[11px] text-gray-400 mt-1">{fechaFormateada} - {horaFormateada}</p>
                                        {mesaNumero && (
                                            <p className="text-[11px] bg-rodrigo-terracotta text-white font-bold rounded-full px-3 py-0.5 inline-block mt-2">MESA: {mesaNumero}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <div className="flex justify-between text-[11px] font-black text-black border-b border-black pb-1 mb-2 uppercase">
                                        <span>CANT  DESCRIPCIÓN</span>
                                        <span>TOTAL</span>
                                    </div>
                                    <div className="space-y-2">
                                        {items.map((item, idx) => {
                                            const cantidad = Number(item.cantidad) || 0;
                                            const precio = Number(item.precio) || 0;
                                            const subtotal = Number((item as any).subtotal) || (cantidad * precio);
                                            return (
                                                <div key={idx} className="py-2 border-b border-gray-100 last:border-0">
                                                    <div className="flex justify-between text-black leading-snug items-start">
                                                        <span className="pr-4 flex gap-2">
                                                            <span className="font-black text-rodrigo-terracotta">{cantidad}</span>
                                                            <span className="font-bold">{item.nombre?.toUpperCase()}</span>
                                                        </span>
                                                        <span className="font-black whitespace-nowrap">S/ {subtotal.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 mt-1 ml-6">
                                                        {(item as any).detalles?.parte && (
                                                            <span className="text-[9px] bg-rodrigo-terracotta/10 text-rodrigo-terracotta px-1.5 py-0.5 rounded font-black">
                                                                PRESA: {(item as any).detalles.parte.toUpperCase()}
                                                            </span>
                                                        )}
                                                        {(item as any).detalles?.trozado && (item as any).detalles.trozado !== 'entero' && (
                                                            <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-black">
                                                                {(item as any).detalles.trozado.toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {(item as any).detalles?.notas && (
                                                        <p className="text-[10px] text-gray-400 italic mt-1 ml-6 leading-tight">
                                                            Nota: {(item as any).detalles.notas}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="border-t-4 border-black pt-3 mb-4">
                                    <div className="flex justify-between items-center">
                                        <span className="font-black text-base text-black uppercase">TOTAL A PAGAR</span>
                                        <span className="text-xl font-black text-black">S/ {total.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="text-center mt-6 pt-4 border-t-2 border-black">
                                    <p className="text-[11px] leading-tight font-bold italic mb-2">"{config.mensaje_boleta}"</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 grid grid-cols-2 gap-3 bg-white">
                            <button onClick={onClose} className="py-3 px-4 rounded-xl font-semibold text-gray-500 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
                                <X size={20} /> Cerrar
                            </button>
                            <button onClick={handlePrint} className="py-3 px-4 rounded-xl font-bold text-white bg-rodrigo-terracotta hover:bg-red-700 shadow-lg transition-all flex items-center justify-center gap-2">
                                <Printer size={20} /> Imprimir
                            </button>
                        </div>
                    </motion.div>

                    {/* El Ticket ahora se renderiza vía Portal */}
                    {mounted && printTicketContent && createPortal(printTicketContent, document.body)}

                </div>
            )}
        </AnimatePresence >
    );
}
