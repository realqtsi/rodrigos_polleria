'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Navigation, Info, Search, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

// Leaflet
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';

// Coordenadas de Rodrigo's (Proporcionadas por el usuario)
const RODRIGOS_LOCATION: [number, number] = [-13.178950365235947, -74.22213214233665];
const ORS_API_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY || '';

interface DeliverySelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (address: string, distanceKm: number, cost: number) => void;
}

// Componente helper para manejar eventos del mapa
const MapEvents = ({ setPosition }: { setPosition: (p: [number, number]) => void }) => {
    useMapEvents({
        click(e) {
            setPosition([e.latlng.lat, e.latlng.lng]);
        },
    });
    return null;
};

// Autopan helper
const RecenterMap = ({ position }: { position: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(position, map.getZoom());
    }, [position, map]);
    return null;
};

export default function DeliverySelector({ isOpen, onClose, onConfirm }: DeliverySelectorProps) {
    const [markerPosition, setMarkerPosition] = useState<[number, number]>(RODRIGOS_LOCATION);
    const [address, setAddress] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const [distance, setDistance] = useState<number | null>(null);
    const [calculatedCost, setCalculatedCost] = useState<number>(0);
    const [manualCost, setManualCost] = useState<string>('');
    const [calculating, setCalculating] = useState(false);
    const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(null);

    // Lógica de cálculo de envío (Reglas del Usuario)
    const calculateShipping = (distanceInKm: number): number => {
        if (distanceInKm <= 1.5) return 3.00;
        if (distanceInKm <= 3.5) return 5.00;
        const extraKm = Math.ceil(distanceInKm - 3.5);
        return 5.00 + (extraKm * 2.00);
    };

    // Búsqueda con Nominatim (Auto-sugerencias con debounce)
    useEffect(() => {
        if (!searchQuery.trim() || searchQuery.length < 3) {
            setSearchResults([]);
            return;
        }

        const fetchPlaces = async () => {
            setIsSearching(true);
            try {
                // Viewbox estricto para Huamanga, Ayacucho y limitación a Perú
                const viewbox = "-74.28,-13.12,-74.18,-13.21";
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&viewbox=${viewbox}&bounded=1&countrycodes=pe&limit=5`);
                const data = await response.json();

                if (data && data.length > 0) {
                    setSearchResults(data);
                } else {
                    // Si el viewbox estricto falla, intentar en Ayacucho en general
                    const fallback = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ", Huamanga")}&countrycodes=pe&limit=5`);
                    const fbData = await fallback.json();
                    setSearchResults(fbData || []);
                }
            } catch (error) {
                console.error("Error searching:", error);
            } finally {
                setIsSearching(false);
            }
        };

        const timeoutId = setTimeout(fetchPlaces, 600);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const handleSelectResult = (result: any) => {
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        setMarkerPosition([lat, lon]);
        setAddress(result.display_name.split(',')[0] || result.display_name);
        setSearchResults([]);
        // Pausar búsqueda temporalmente para no re-disparar el fetch
        setSearchQuery("");
    };

    // Calcular Ruta con OpenRouteService
    useEffect(() => {
        if (markerPosition[0] === RODRIGOS_LOCATION[0] && markerPosition[1] === RODRIGOS_LOCATION[1]) {
            setDistance(0);
            setCalculatedCost(0);
            setManualCost('');
            setRouteGeometry(null);
            return;
        }

        const fetchRoute = async () => {
            if (!ORS_API_KEY) {
                // Fallback a línea recta si no hay API Key (haversine)
                const lat1 = RODRIGOS_LOCATION[0];
                const lon1 = RODRIGOS_LOCATION[1];
                const lat2 = markerPosition[0];
                const lon2 = markerPosition[1];
                const p = 0.017453292519943295;
                const c = Math.cos;
                const a = 0.5 - c((lat2 - lat1) * p) / 2 + c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p)) / 2;
                const km = 12742 * Math.asin(Math.sqrt(a));
                setDistance(km);
                const suggested = calculateShipping(km);
                setCalculatedCost(suggested);
                setManualCost(suggested.toFixed(2));
                return;
            }

            setCalculating(true);
            try {
                // ORS Usa [lng, lat]
                const startParams = `${RODRIGOS_LOCATION[1]},${RODRIGOS_LOCATION[0]}`;
                const endParams = `${markerPosition[1]},${markerPosition[0]}`;
                const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${startParams}&end=${endParams}`;

                const res = await fetch(url);
                const data = await res.json();

                if (data.features && data.features.length > 0) {
                    const feature = data.features[0];
                    const distKm = feature.properties.segments[0].distance / 1000;
                    setDistance(distKm);
                    const suggested = calculateShipping(distKm);
                    setCalculatedCost(suggested);
                    // Actualizar manualCost solo si está vacío o si lo quiere auto-actulizar, 
                    // para mayor fluidez lo sobreescribimos cada vez que cambia el punto en el mapa:
                    setManualCost(suggested.toFixed(2));

                    // Decode geometry (está en [lng, lat], react-leaflet usa [lat, lng])
                    const coordinates = feature.geometry.coordinates;
                    const flipped = coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
                    setRouteGeometry(flipped);
                } else {
                    toast.error("No se pudo calcular la ruta para esta ubicación.");
                    setDistance(null);
                    setCalculatedCost(0);
                }
            } catch (error) {
                console.error("ORS Error:", error);
                toast.error("Fallo al conectar con servicio de rutas.");
                setDistance(null);
            } finally {
                setCalculating(false);
            }
        };

        const debounce = setTimeout(fetchRoute, 800);
        return () => clearTimeout(debounce);
    }, [markerPosition]);


    const handleConfirm = () => {
        const finalCost = parseFloat(manualCost);
        if (!address || isNaN(finalCost) || finalCost < 0) {
            toast.error('Verifica la dirección y el costo antes de agregar.');
            return;
        }
        onConfirm(address, distance || 0, finalCost);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-rodrigo-mustard/20"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-rodrigo-terracotta to-red-600 p-5 flex items-center justify-between text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                            <MapPin size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Ubicación de Delivery</h2>
                            <p className="text-white/80 text-xs font-medium tracking-wide">Huamanga, Ayacucho</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 bg-black/10 hover:bg-black/20 rounded-full flex items-center justify-center transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 lg:p-6 flex flex-col lg:flex-row gap-6 flex-1 min-h-[500px] overflow-hidden">

                    {/* Panel Izquierdo: Mapa */}
                    <div className="flex-1 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-inner bg-slate-50 relative flex flex-col z-0">
                        {/* Search Bar (Fuera del Canvas de Leaflet pero dentro del panel) */}
                        <div className="absolute top-4 left-4 right-4 z-1000 drop-shadow-xl">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Escribe la calle, barrio o lugar en Ayacucho..."
                                    className="w-full pl-10 pr-10 py-3 bg-white rounded-xl border-2 border-transparent focus:border-rodrigo-mustard focus:outline-none text-sm text-slate-700 font-medium"
                                />
                                {isSearching && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-rodrigo-terracotta animate-spin" size={18} />
                                )}
                            </div>

                            {/* Resultados de búsqueda (Autocompletado) */}
                            {searchResults.length > 0 && searchQuery.length > 0 && (
                                <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-100 max-h-60 overflow-y-auto">
                                    {searchResults.map((res: any, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleSelectResult(res)}
                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors text-sm text-slate-700 font-medium flex items-center gap-2"
                                        >
                                            <MapPin size={16} className="text-rodrigo-mustard shrink-0" />
                                            <span className="truncate">{res.display_name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <MapContainer
                            center={RODRIGOS_LOCATION}
                            zoom={15}
                            style={{ width: '100%', height: '100%', zIndex: 0 }}
                            zoomControl={false}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                            />

                            <MapEvents setPosition={setMarkerPosition} />
                            <RecenterMap position={markerPosition} />

                            {/* Local Rodrigo's (Origen) */}
                            <Marker position={RODRIGOS_LOCATION} icon={new L.Icon({
                                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
                                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                                iconSize: [25, 41],
                                iconAnchor: [12, 41],
                                popupAnchor: [1, -34],
                                shadowSize: [41, 41]
                            })} />

                            {/* Destino */}
                            {(markerPosition[0] !== RODRIGOS_LOCATION[0] || markerPosition[1] !== RODRIGOS_LOCATION[1]) && (
                                <Marker position={markerPosition} icon={new L.Icon({
                                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
                                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                                    iconSize: [25, 41],
                                    iconAnchor: [12, 41],
                                    popupAnchor: [1, -34],
                                    shadowSize: [41, 41]
                                })} />
                            )}

                            {/* Ruta */}
                            {routeGeometry && (
                                <Polyline positions={routeGeometry} color="#D35400" weight={4} opacity={0.8} />
                            )}
                        </MapContainer>
                    </div>

                    {/* Panel Derecho: Info y Cobro */}
                    <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0">
                        <div>
                            <h3 className="text-sm font-bold text-rodrigo-brown mb-2 flex items-center gap-2">
                                <Navigation size={16} className="text-rodrigo-terracotta" />
                                Detalle del Envío
                            </h3>

                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                                <label className="text-xs font-semibold text-slate-500 mb-1 block">Dirección exacta:</label>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="Manzana, lote, referencia..."
                                    className="w-full bg-white px-3 py-2 rounded-lg text-sm border border-slate-200 focus:outline-none focus:border-rodrigo-mustard text-slate-700 font-medium"
                                />
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-rodrigo-cream to-white border border-rodrigo-mustard/30 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-rodrigo-mustard/10 rounded-full -mr-8 -mt-8 pointer-events-none"></div>

                            <div className="flex justify-between items-end mb-4 border-b border-rodrigo-brown/10 pb-4">
                                <div>
                                    <p className="text-xs font-bold text-rodrigo-brown/60 uppercase tracking-wider mb-1">Distancia por Ruta</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-black text-rodrigo-brown">
                                            {distance !== null ? distance.toFixed(1) : '--'}
                                        </span>
                                        <span className="text-sm font-bold text-rodrigo-brown/60">km</span>
                                    </div>
                                </div>
                                {calculating && <Loader2 className="animate-spin text-rodrigo-terracotta" size={24} />}
                            </div>

                            <div>
                                <p className="text-xs font-bold text-rodrigo-brown/60 uppercase tracking-wider mb-2 flex justify-between items-center">
                                    <span>Flete (Editable)</span>
                                    {calculatedCost > 0 && (
                                        <span className="text-[10px] bg-rodrigo-mustard/20 text-rodrigo-brown px-2 py-0.5 rounded-md border border-rodrigo-mustard/30">
                                            Sug: S/ {calculatedCost.toFixed(2)}
                                        </span>
                                    )}
                                </p>
                                <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-3 py-2 shadow-inner focus-within:border-rodrigo-mustard transition-colors">
                                    <span className="text-xl font-bold text-slate-400">S/</span>
                                    <input
                                        type="number"
                                        step="0.10"
                                        min="0"
                                        value={manualCost}
                                        onChange={(e) => setManualCost(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full text-3xl font-black text-rodrigo-terracotta bg-transparent focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Regla de negocio helper */}
                            <div className="mt-4 pt-3 border-t border-rodrigo-brown/10">
                                <p className="text-[10px] text-rodrigo-brown/60 leading-tight">
                                    <strong>Tarifario base:</strong> 0-1.5km S/3. 1.5-3.5km S/5. Extra S/2/km. (Puedes modificarlo).
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleConfirm}
                            disabled={!address || manualCost === ''}
                            className="w-full py-4 bg-black text-white font-black text-lg rounded-2xl shadow-lg mt-auto hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                        >
                            AGREGAR ENVÍO <Check size={20} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
