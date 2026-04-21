'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Negocio {
    id: string;
    nombre: string;
    slug: string;
    logo_url: string;
    color_primario: string;
    color_secundario: string;
    config_json: Record<string, any>;
}

interface BusinessContextType {
    negocio: Negocio | null;
    loading: boolean;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
    const [negocio, setNegocio] = useState<Negocio | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNegocio = async () => {
            try {
                // 1. Detectar slug por subdominio (ej: rodrigos.miapp.com)
                const hostname = window.location.hostname;
                const parts = hostname.split('.');
                let currentSlug = 'rodrigos'; // Default fallback para desarrollo local

                // Si tiene más de dos partes y no es www (ej: subdominio.midominio.com)
                if (parts.length > 2 && parts[0] !== 'www') {
                    currentSlug = parts[0];
                }

                // 2. O detectar por segmento de ruta si la URL es midominio.com/n/rodrigos
                const pathParts = window.location.pathname.split('/');
                if (pathParts[1] === 'n' && pathParts[2]) {
                    currentSlug = pathParts[2];
                }

                console.log('[BusinessContext] Detectando negocio. Slug =', currentSlug);

                const { data, error } = await supabase
                    .from('negocios')
                    .select('*')
                    .eq('slug', currentSlug)
                    .single();

                if (error) throw error;
                
                if (data) {
                    setNegocio(data as Negocio);
                    aplicarEstilos(data as Negocio);
                }
            } catch (error) {
                console.error('[BusinessContext] Error al cargar la configuración del negocio:', error);
                // Aquí podrías fijar un negocio por defecto si falla o mostrar un error
            } finally {
                setLoading(false);
            }
        };

        fetchNegocio();
    }, []);

    const aplicarEstilos = (n: Negocio) => {
        if (!n) return;
        const root = document.documentElement;

        // Si tenemos colores en la DB, sobrescribimos las variables definidas en globals.css
        if (n.color_primario) {
            root.style.setProperty('--rodrigo-terracotta', n.color_primario);
        }
        if (n.color_secundario) {
            root.style.setProperty('--rodrigo-mustard', n.color_secundario);
        }

        // Título de la pestaña - Solo si no estamos en login
        if (n.nombre && window.location.pathname !== '/login') {
            document.title = `${n.nombre} - Sistema POS`;
        }
    };

    return (
        <BusinessContext.Provider value={{ negocio, loading }}>
            {/* Opcional: mostrar un global loader mientras carga el contexto del negocio */}
            {loading ? (
                <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
                    <div className="animate-pulse space-y-4 flex flex-col items-center">
                        <div className="w-16 h-16 border-4 border-slate-200 border-t-[#6366f1] rounded-full animate-spin"></div>
                        <p className="text-slate-500 font-medium tracking-wide">Cargando Plataforma...</p>
                    </div>
                </div>
            ) : (
                children
            )}
        </BusinessContext.Provider>
    );
}

export function useBusiness() {
    const context = useContext(BusinessContext);
    if (context === undefined) {
        throw new Error('useBusiness debe usarse dentro de un BusinessProvider');
    }
    return context;
}
