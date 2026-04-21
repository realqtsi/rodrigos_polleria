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
                    className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                >
                    {/* Encabezado */}
                    <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">
                                {negocio ? 'Editar Negocio' : 'Nuevo Negocio (Tenant)'}
                            </h2>
                            <p className="text-sm font-medium text-slate-500">
                                {negocio ? 'Modificar datos o branding' : 'Crear un nuevo restaurante aislado'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Contenido (Formulario) */}
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Nombre del Negocio *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.nombre}
                                    onChange={e => setFormData({...formData, nombre: e.target.value})}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all placeholder:font-normal"
                                    placeholder="Ej: Pocholo's Restobar"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5 flex justify-between">
                                    Slug URL *
                                    <span className="text-slate-400 font-normal">subdominio único</span>
                                </label>
                                <div className="flex border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-slate-900 focus-within:border-transparent transition-all">
                                    <span className="bg-slate-100 px-4 flex items-center text-slate-500 text-sm font-medium border-r border-slate-200">
                                        /n/
                                    </span>
                                    <input
                                        type="text"
                                        required
                                        value={formData.slug}
                                        onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-r-xl text-slate-900 font-bold focus:ring-0 outline-none placeholder:font-normal"
                                        placeholder="pocholos"
                                    />
                                </div>
                                <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                                    <AlertCircle size={12} />
                                    El sistema usará este slug o el subdominio {formData.slug || 'xyz'}.localhost
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">URL del Logo</label>
                                <input
                                    type="text"
                                    value={formData.logo_url}
                                    onChange={e => setFormData({...formData, logo_url: e.target.value})}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all placeholder:font-normal"
                                    placeholder="https://..."
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Color Primario</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="color"
                                            value={formData.color_primario}
                                            onChange={e => setFormData({...formData, color_primario: e.target.value})}
                                            className="w-12 h-12 rounded-xl cursor-pointer border-0 bg-transparent p-0"
                                        />
                                        <span className="text-slate-600 font-mono text-sm uppercase">{formData.color_primario}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Color Secundario</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="color"
                                            value={formData.color_secundario}
                                            onChange={e => setFormData({...formData, color_secundario: e.target.value})}
                                            className="w-12 h-12 rounded-xl cursor-pointer border-0 bg-transparent p-0"
                                        />
                                        <span className="text-slate-600 font-mono text-sm uppercase">{formData.color_secundario}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>

                    {/* Acciones */}
                    <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/50 flex gap-3 justify-end items-center">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 shadow-sm rounded-xl hover:bg-slate-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-6 py-3 bg-slate-900 text-white font-black rounded-xl hover:bg-rodrigo-terracotta active:scale-95 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
