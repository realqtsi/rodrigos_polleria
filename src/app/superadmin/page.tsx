'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { supabase } from '@/lib/supabase';
import { Negocio } from '@/contexts/BusinessContext';
import { Plus, Edit2, Boxes, Target } from 'lucide-react';
import Image from 'next/image';
import AdminBusinessModal from '@/components/AdminBusinessModal';
import toast from 'react-hot-toast';

export default function SuperadminPage() {
    const [negocios, setNegocios] = useState<Negocio[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedNegocio, setSelectedNegocio] = useState<Negocio | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchNegocios = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('negocios')
                .select('*')
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            setNegocios(data as Negocio[]);
        } catch (error: any) {
            console.error('Error fetching businesses:', error);
            toast.error('Error cargando la lista de negocios');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNegocios();
    }, []);

    const openCreateModal = () => {
        setSelectedNegocio(null);
        setIsModalOpen(true);
    };

    const openEditModal = (n: Negocio) => {
        setSelectedNegocio(n);
        setIsModalOpen(true);
    };

    return (
        <ProtectedRoute requiredPermission="superadmin_panel">
            <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <Boxes className="text-rodrigo-mustard" size={32} />
                            Gestión SaaS
                        </h1>
                        <p className="text-slate-500 font-medium">Administración maestra de inquilinos (Tenants)</p>
                    </div>
                    
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-rodrigo-terracotta transition-colors shadow-xl"
                    >
                        <Plus size={20} />
                        Crear Negocio
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-slate-900 mx-auto"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {negocios.map((n) => (
                            <div key={n.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between h-full hover:shadow-md transition-shadow relative overflow-hidden group">
                                <div 
                                    className="absolute top-0 left-0 w-full h-2"
                                    style={{ backgroundColor: n.color_primario || '#9a3412' }}
                                />
                                
                                <div>
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 relative shadow-sm">
                                            {n.logo_url ? (
                                                <Image src={n.logo_url} alt={n.nombre} fill className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                    <Target size={24} />
                                                </div>
                                            )}
                                        </div>
                                        <button 
                                            onClick={() => openEditModal(n)}
                                            className="p-2 text-slate-400 hover:text-slate-900 transition-colors bg-slate-50 rounded-xl hover:bg-slate-100"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                    </div>
                                    
                                    <h3 className="text-xl font-black text-slate-900 leading-tight mb-1">{n.nombre}</h3>
                                    <p className="text-slate-500 text-sm font-medium mb-4 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: n.color_secundario || '#eab308' }} />
                                        /{n.slug}
                                    </p>
                                </div>
                                
                                <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tenant ID</span>
                                    <code className="text-xs text-slate-600 bg-slate-50 py-1 px-2 rounded-md font-mono">
                                        {n.id.substring(0,8)}...
                                    </code>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isModalOpen && (
                <AdminBusinessModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    negocio={selectedNegocio}
                    onSave={fetchNegocios}
                />
            )}
        </ProtectedRoute>
    );
}
