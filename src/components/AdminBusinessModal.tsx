import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Negocio } from '@/contexts/BusinessContext';
import toast from 'react-hot-toast';

interface AdminBusinessModalProps {
    isOpen: boolean;
    onClose: () => void;
    negocio: Negocio | null;
    onSave: () => void;
}

export default function AdminBusinessModal({ isOpen, onClose, negocio, onSave }: AdminBusinessModalProps) {
    const [formData, setFormData] = useState({
        nombre: '',
        slug: '',
        logo_url: '/images/logo-rodrigos.jpeg',
        color_primario: '#9a3412', // Terracotta
        color_secundario: '#eab308' // Mustard
    });
    
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (negocio) {
            setFormData({
                nombre: negocio.nombre || '',
                slug: negocio.slug || '',
                logo_url: negocio.logo_url || '',
                color_primario: negocio.color_primario || '#9a3412',
                color_secundario: negocio.color_secundario || '#eab308'
            });
        }
    }, [negocio]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.nombre || !formData.slug) {
            toast.error('Nombre y Slug son obligatorios');
            return;
        }

        const slugRegex = /^[a-z0-9-]+$/;
        if (!slugRegex.test(formData.slug)) {
            toast.error('El slug solo puede contener minúsculas, números y guiones');
            return;
        }

        setLoading(true);

        try {
            if (negocio) {
                // Update
                const { error } = await supabase
                    .from('negocios')
                    .update({
                        nombre: formData.nombre,
                        slug: formData.slug,
                        logo_url: formData.logo_url,
                        color_primario: formData.color_primario,
                        color_secundario: formData.color_secundario,
                    })
                    .eq('id', negocio.id);
                
                if (error) throw error;
                toast.success('Negocio actualizado con éxito');
            } else {
                // Create
                const { error } = await supabase
                    .from('negocios')
                    .insert([{
                        nombre: formData.nombre,
                        slug: formData.slug,
                        logo_url: formData.logo_url,
                        color_primario: formData.color_primario,
                        color_secundario: formData.color_secundario,
                    }]);
                
                if (error) {
                    if (error.code === '23505') { // Unique violation
                        toast.error('Este Slug ya está siendo utilizado por otro negocio');
                        return;
                    }
                    throw error;
                }
                toast.success('¡Nuevo negocio (Tenant) creado!');
            }
            onSave();
            onClose();
        } catch (error: any) {
            console.error('Error guardando negocio:', error);
            toast.error(error.message || 'Ocurrió un error al guardar');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            >
                    <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="kodify-glass backdrop-blur-2xl rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh] border border-white/10"
                >
                    {/* Encabezado */}
                    <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">
                                {negocio ? 'Editar Negocio' : 'Nuevo Negocio (Tenant)'}
                            </h2>
                            <p className="text-sm font-medium text-slate-400">
                                {negocio ? 'Modificar datos o branding' : 'Crear un nuevo restaurante aislado'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Contenido (Formulario) */}
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-8 space-y-8 no-scrollbar">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-black text-slate-300 mb-2 uppercase tracking-widest text-[10px]">Nombre del Negocio *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.nombre}
                                    onChange={e => setFormData({...formData, nombre: e.target.value})}
                                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600 shadow-inner"
                                    placeholder="Ej: Pocholo's Restobar"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-black text-slate-300 mb-2 uppercase tracking-widest text-[10px] flex justify-between">
                                    Slug URL *
                                    <span className="text-slate-500 font-normal">subdominio único</span>
                                </label>
                                <div className="flex border border-white/10 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all bg-white/5 shadow-inner">
                                    <span className="bg-white/5 px-5 flex items-center text-slate-400 text-sm font-bold border-r border-white/5">
                                        /n/
                                    </span>
                                    <input
                                        type="text"
                                        required
                                        value={formData.slug}
                                        onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                                        className="w-full px-5 py-4 bg-transparent border-none rounded-r-2xl text-indigo-400 font-bold focus:ring-0 outline-none placeholder:text-slate-600"
                                        placeholder="pocholos"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1.5 font-medium italic">
                                    <AlertCircle size={14} />
                                    El sistema usará este slug o el subdominio {formData.slug || 'xyz'}.localhost
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-black text-slate-300 mb-2 uppercase tracking-widest text-[10px]">URL del Logo</label>
                                <input
                                    type="text"
                                    value={formData.logo_url}
                                    onChange={e => setFormData({...formData, logo_url: e.target.value})}
                                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600 shadow-inner"
                                    placeholder="https://..."
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/5">
                                <div>
                                    <label className="block text-sm font-black text-slate-400 mb-3 uppercase tracking-widest text-[9px]">Color Primario</label>
                                    <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/5">
                                        <input
                                            type="color"
                                            value={formData.color_primario}
                                            onChange={e => setFormData({...formData, color_primario: e.target.value})}
                                            className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent p-0 overflow-hidden"
                                        />
                                        <span className="text-indigo-300 font-mono text-xs uppercase font-bold tracking-wider">{formData.color_primario}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-black text-slate-400 mb-3 uppercase tracking-widest text-[9px]">Color Secundario</label>
                                    <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/5">
                                        <input
                                            type="color"
                                            value={formData.color_secundario}
                                            onChange={e => setFormData({...formData, color_secundario: e.target.value})}
                                            className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent p-0 overflow-hidden"
                                        />
                                        <span className="text-indigo-300 font-mono text-xs uppercase font-bold tracking-wider">{formData.color_secundario}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>

                    {/* Acciones */}
                    <div className="px-8 py-6 border-t border-white/5 bg-white/5 flex gap-4 justify-end items-center">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-8 py-4 font-bold text-slate-400 hover:text-white bg-transparent rounded-2xl hover:bg-white/5 transition-all text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 active:scale-95 transition-all flex items-center gap-3 shadow-[0_0_30px_rgba(99,102,241,0.3)] disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-widest"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save size={18} />
                            )}
                            {loading ? 'Guardando...' : 'Guardar Negocio'}
                        </button>
                    </div>

                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
