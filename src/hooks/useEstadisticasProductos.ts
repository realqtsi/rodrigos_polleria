'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface EstadisticaProducto {
    id: string;
    producto_id: string;
    nombre_producto: string;
    cantidad_total: number;
    veces_vendido: number;
    ingresos_total: number;
    ultima_venta: string;
}

export function useEstadisticasProductos(negocioId?: string) {
    const [topProductos, setTopProductos] = useState<EstadisticaProducto[]>([]);
    const [loading, setLoading] = useState(true);

    const cargarEstadisticas = async () => {
        try {
            let query = supabase
                .from('estadisticas_productos')
                .select('*')
                .order('veces_vendido', { ascending: false })
                .limit(8);

            if (negocioId) {
                query = query.eq('negocio_id', negocioId);
            }

            const { data, error } = await query;

            if (error) {
                console.log('Tabla estadisticas_productos no existe o está vacía');
                setTopProductos([]);
            } else {
                setTopProductos(data || []);
            }
        } catch (error) {
            console.log('Error cargando estadísticas');
        } finally {
            setLoading(false);
        }
    };

    // Actualizar estadísticas cuando se vende un producto
    const registrarVentaProducto = async (productoId: string, nombreProducto: string, cantidad: number, precio: number) => {
        try {
            // Verificar si ya existe
            let query = supabase
                .from('estadisticas_productos')
                .select('*')
                .eq('producto_id', productoId);

            if (negocioId) {
                query = query.eq('negocio_id', negocioId);
            }

            const { data: existente } = await query.single();

            if (existente) {
                // Actualizar existente
                let updateQuery = supabase
                    .from('estadisticas_productos')
                    .update({
                        cantidad_total: existente.cantidad_total + cantidad,
                        veces_vendido: existente.veces_vendido + 1,
                        ingresos_total: existente.ingresos_total + (cantidad * precio),
                        ultima_venta: new Date().toISOString()
                    })
                    .eq('producto_id', productoId);
                
                if (negocioId) {
                    updateQuery = updateQuery.eq('negocio_id', negocioId);
                }
                
                await updateQuery;
            } else {
                // Crear nuevo
                await supabase
                    .from('estadisticas_productos')
                    .insert({
                        producto_id: productoId,
                        nombre_producto: nombreProducto,
                        cantidad_total: cantidad,
                        veces_vendido: 1,
                        ingresos_total: cantidad * precio,
                        ultima_venta: new Date().toISOString(),
                        negocio_id: negocioId || null
                    });
            }

            // Recargar estadísticas
            cargarEstadisticas();
        } catch (error) {
            console.log('Error registrando estadística de venta');
        }
    };

    useEffect(() => {
        cargarEstadisticas();
    }, [negocioId]);

    return {
        topProductos,
        loading,
        refetch: cargarEstadisticas,
        registrarVentaProducto
    };
}
