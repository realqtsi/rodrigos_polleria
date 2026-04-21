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
            <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-10 min-h-screen">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-8 border-b border-white/5">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-4">
                            <div className="p-3 bg-indigo-600/20 rounded-2xl border border-indigo-500/30">
                                <Boxes className="text-indigo-400" size={32} />
                            </div>
                            Gestión SaaS
                        </h1>
                        <p className="text-slate-400 font-medium mt-2 text-lg">Administración maestra de inquilinos (Tenants)</p>
                    </div>
                    
                    <button
                        onClick={() => {
                            console.log('[Superadmin] Opening Create Modal');
                            openCreateModal();
                        }}
                        className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-500 transition-all shadow-[0_0_30px_rgba(99,102,241,0.4)] active:scale-95 group"
                    >
                        <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                        CREAR NEGOCIO
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-slate-900 mx-auto"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {negocios.map((n) => (
                            <div key={n.id} className="kodify-glass rounded-[2rem] p-8 border border-white/5 flex flex-col justify-between h-full hover:border-indigo-500/50 transition-all duration-500 relative overflow-hidden group">
                                <div 
                                    className="absolute top-0 left-0 w-full h-1.5 opacity-50 group-hover:opacity-100 transition-opacity"
                                    style={{ backgroundColor: n.color_primario || '#6366f1' }}
                                />
                                
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-8">
                                        <div className="w-20 h-20 rounded-[1.5rem] overflow-hidden bg-white/5 border border-white/10 relative shadow-2xl p-1">
                                            <div className="w-full h-full rounded-[1.2rem] overflow-hidden relative">
                                                {n.logo_url ? (
                                                    <Image src={n.logo_url} alt={n.nombre} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-500 bg-slate-900">
                                                        <Target size={32} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => openEditModal(n)}
                                            className="p-3 text-slate-400 hover:text-white transition-all bg-white/5 rounded-2xl hover:bg-white/10 border border-white/5"
                                        >
                                            <Edit2 size={20} />
                                        </button>
                                    </div>
                                    
                                    <h3 className="text-2xl font-black text-white leading-tight mb-2 tracking-tight">{n.nombre}</h3>
                                    <p className="text-indigo-400/80 text-sm font-bold mb-6 flex items-center gap-2 bg-indigo-500/5 py-1.5 px-3 rounded-full w-fit border border-indigo-500/10">
                                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: n.color_secundario || '#eab308' }} />
                                        /{n.slug}
                                    </p>

                                    <button
                                        onClick={() => {
                                            window.location.href = `/n/${n.slug}/pos`;
                                        }}
                                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-4 rounded-2xl font-black hover:bg-indigo-500 transition-all active:scale-95 shadow-xl shadow-indigo-600/30 group/btn"
                                    >
                                        <Target size={20} className="group-hover/btn:scale-125 transition-transform" />
                                        GESTIONAR NEGOCIO
                                    </button>
                                </div>
                                
                                <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between relative z-10">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Tenant Identifier</span>
                                    <code className="text-[10px] text-indigo-300 bg-indigo-500/10 py-1.5 px-3 rounded-lg font-mono border border-indigo-500/20">
                                        {n.id.substring(0,12)}
                                    </code>
                                </div>
                                
                                {/* Decoración de fondo */}
                                <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-indigo-600/5 blur-[50px] rounded-full group-hover:bg-indigo-600/10 transition-colors" />
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
