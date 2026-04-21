'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingCart, BarChart, Lock, ClipboardList, ChefHat, Package, Menu, X, Settings, RotateCcw, Navigation, LogOut } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { hasPermission } from '@/lib/roles';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const menuSections = [
    {
        title: 'Tablero',
        items: [
            { icon: Home, label: 'Inicio', href: '/', permission: 'dashboard' },
        ]
    },
    {
        title: 'Operaciones',
        items: [
            { icon: ShoppingCart, label: 'Pedidos', href: '/pos', permission: 'pos' },
            { icon: ChefHat, label: 'Cocina', href: '/cocina', permission: 'cocina' },
            { icon: Navigation, label: 'Entregas', href: '/delivery', permission: 'delivery' },
        ]
    },
    {
        title: 'Caja y Control',
        items: [
            { icon: ClipboardList, label: 'Apertura', href: '/apertura', permission: 'apertura' },
            { icon: Package, label: 'Caja y Ventas', href: '/ventas', permission: 'ventas' },
            { icon: Lock, label: 'Cierre', href: '/cierre', permission: 'cierre' },
        ]
    },
    {
        title: 'Administración',
        items: [
            { icon: BarChart, label: 'Reportes', href: '/reportes', permission: 'reportes' },
            { icon: RotateCcw, label: 'Restablecer', href: '/mantenimiento', permission: 'configuracion' },
            { icon: Settings, label: 'Configuración', href: '/configuracion', permission: 'configuracion' },
        ]
    }
];

export default function Navbar() {
    const pathname = usePathname();
    const { user, loading: authLoading, logout } = useAuth();
    const { negocio } = useBusiness();
    const [isMounted, setIsMounted] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => { setIsMounted(true); }, []);

    if (authLoading || !user || !isMounted) return null;

    const filteredSections = menuSections.map(section => ({
        ...section,
        items: section.items.filter(item => hasPermission(user.rol, item.permission))
    })).filter(section => section.items.length > 0);

    return (
        <>
            {/* SIDEBAR (Desktop) - siempre visible */}
            <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-60 flex-col z-50 bg-white border-r border-slate-100 shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-3 px-5 py-6 border-b border-slate-50">
                    <div className="relative w-10 h-10 shrink-0 rounded-xl overflow-hidden shadow-sm border border-slate-100">
                        <Image src={negocio?.logo_url || "/images/logo-rodrigos.jpeg"} alt={negocio?.nombre || "Rodrigo's"} fill className="object-cover" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-slate-900 leading-none tracking-tight">{negocio?.nombre || "Rodrigo's"}</h1>
                        <p className="text-[10px] text-rodrigo-terracotta font-bold uppercase tracking-wider mt-1">{negocio?.config_json?.tagline?.substring(0,20) || "Brasas & Broasters"}</p>
                    </div>
                </div>

                <nav className="flex-1 py-4 px-3 overflow-y-auto no-scrollbar">
                    {filteredSections.map((section, sectionIndex) => (
                        <div key={section.title} className="mb-4">
                            {sectionIndex > 0 && (
                                <div className="mx-2 mb-4 h-px bg-slate-100" />
                            )}
                            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.15em] px-4 mb-2">
                                {section.title}
                            </p>
                            <div className="space-y-0.5">
                                {section.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link key={item.href} href={item.href}>
                                            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] transition-all duration-200 group ${isActive
                                                ? 'bg-rodrigo-terracotta text-white font-bold shadow-md shadow-rodrigo-terracotta/20'
                                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-semibold'
                                                }`}>
                                                <item.icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-rodrigo-terracotta transition-colors'} />
                                                <span>{item.label}</span>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="border-t border-slate-50 p-4 bg-slate-50/30">
                    <div className="flex items-center gap-3 mb-3 p-2">
                        <div className="w-9 h-9 rounded-full bg-rodrigo-mustard/10 flex items-center justify-center text-rodrigo-mustard text-sm font-black border border-rodrigo-mustard/20">
                            {user.nombre.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-900 truncate tracking-tight">{user.nombre}</p>
                            <p className="text-[10px] text-slate-400 capitalize font-bold">{user.rol}</p>
                        </div>
                    </div>
                    <button onClick={logout}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                        <LogOut size={14} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* MOBILE HEADER - con botón hamburguesa */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-[60] bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-600 active:scale-95 transition-all"
                    >
                        <Menu size={22} />
                    </button>
                    <div className="flex items-center gap-2.5">
                        <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-sm border border-slate-100">
                            <Image src={negocio?.logo_url || "/images/logo-rodrigos.jpeg"} alt="Logo" fill className="object-cover" />
                        </div>
                        <div className="leading-none">
                            <span className="font-black text-slate-900 text-sm block tracking-tight">{negocio?.nombre || "Rodrigo's"}</span>
                            <span className="text-[9px] text-rodrigo-terracotta font-extrabold uppercase tracking-widest">{negocio?.config_json?.tagline?.substring(0,10) || "POS System"}</span>
                        </div>
                    </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-black shadow-md border-2 border-white">
                    {user.nombre.charAt(0)}
                </div>
            </header>

            {/* BOTTOM NAV (Mobile Only) */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white/95 backdrop-blur-xl border-t border-slate-100 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <div className="flex items-center justify-around h-20 px-4">
                    {[
                        { icon: Home, label: 'Inicio', href: '/', permission: 'dashboard' },
                        { icon: ShoppingCart, label: 'Pedidos', href: '/pos', permission: 'pos' },
                        { icon: Package, label: 'Ventas', href: '/ventas', permission: 'ventas' },
                        { icon: ChefHat, label: 'Cocina', href: '/cocina', permission: 'cocina' },
                        { icon: Navigation, label: 'Entregas', href: '/delivery', permission: 'delivery' },
                    ].filter(item => hasPermission(user.rol, item.permission)).map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.href} href={item.href} className="flex-1 max-w-[80px]">
                                <div className={`flex flex-col items-center justify-center gap-1.5 h-full transition-all duration-300 ${isActive ? 'text-rodrigo-terracotta' : 'text-slate-400'}`}>
                                    <div className={`p-2 rounded-2xl transition-all ${isActive ? 'bg-rodrigo-terracotta/10 scale-110' : 'active:scale-90'}`}>
                                        <Icon size={isActive ? 20 : 18} strokeWidth={isActive ? 3 : 2} />
                                    </div>
                                    <span className={`text-[9px] font-black uppercase tracking-widest transition-opacity ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                                        {item.label}
                                    </span>
                                    {isActive && (
                                        <motion.div layoutId="bottom-dot" className="w-1 h-1 bg-rodrigo-terracotta rounded-full absolute bottom-2" />
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* MOBILE SIDEBAR - Overlay drawer */}
            <AnimatePresence>
                {sidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="lg:hidden fixed inset-0 bg-black/50 z-50"
                            onClick={() => setSidebarOpen(false)}
                        />
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'tween', duration: 0.3 }}
                            className="lg:hidden fixed left-0 top-0 h-screen w-72 max-w-[85vw] z-50 bg-white shadow-2xl flex flex-col"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-slate-100">
                                        <Image src={negocio?.logo_url || "/images/logo-rodrigos.jpeg"} alt={negocio?.nombre || "Rodrigo's"} fill className="object-cover" />
                                    </div>
                                    <div>
                                        <h1 className="text-sm font-black text-slate-900">{negocio?.nombre || "Rodrigo's"}</h1>
                                        <p className="text-[10px] text-rodrigo-terracotta font-bold">{negocio?.config_json?.tagline?.substring(0,20) || "Brasas & Broasters"}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Navigation */}
                            <nav className="flex-1 py-6 px-4 overflow-y-auto no-scrollbar">
                                {filteredSections.map((section, sectionIndex) => (
                                    <div key={section.title} className="mb-8">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4 mb-3 italic">
                                            {section.title}
                                        </p>
                                        <div className="space-y-1">
                                            {section.items.map((item) => {
                                                const Icon = item.icon;
                                                const isActive = pathname === item.href;
                                                return (
                                                    <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}>
                                                        <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl text-sm transition-all active:scale-[0.98] ${isActive
                                                            ? 'bg-rodrigo-terracotta text-white font-black shadow-lg shadow-rodrigo-terracotta/20'
                                                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-bold'
                                                            }`}>
                                                            <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400'} />
                                                            <span className="tracking-tight">{item.label}</span>
                                                        </div>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </nav>

                            {/* User Footer */}
                            <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-rodrigo-mustard/10 flex items-center justify-center text-rodrigo-mustard text-sm font-black border border-rodrigo-mustard/20">
                                        {user.nombre.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-black text-slate-900">{user.nombre}</p>
                                        <p className="text-[10px] text-slate-400 capitalize">{user.rol}</p>
                                    </div>
                                </div>
                                <button onClick={logout}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                                    <LogOut size={14} />
                                    <span>Cerrar Sesión</span>
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
