'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingCart, BarChart, Lock, ClipboardList, ChefHat, Package, Menu, X, Settings, RotateCcw, Navigation, User, LogOut } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/roles';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

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
            { icon: ClipboardList, label: 'Apertura de Día', href: '/apertura', permission: 'apertura' },
            { icon: Package, label: 'Caja y Ventas', href: '/ventas', permission: 'ventas' },
            { icon: Lock, label: 'Cierre de Caja', href: '/cierre', permission: 'cierre' },
        ]
    },
    {
        title: 'Administración',
        items: [
            { icon: BarChart, label: 'Reportes', href: '/reportes', permission: 'reportes' },
            { icon: RotateCcw, label: 'Restablecer Sistema', href: '/mantenimiento', permission: 'configuracion' },
            { icon: Settings, label: 'Configuración', href: '/configuracion', permission: 'configuracion' },
        ]
    }
];

// Flatten for mobile bottom nav
const flatMenuItems = menuSections.flatMap(s => s.items);

export default function Navbar() {
    const pathname = usePathname();
    const { user, loading, logout } = useAuth();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => { setIsMounted(true); }, []);

    if (loading || !user || !isMounted) return null;

    // Filter sections for desktop
    const filteredSections = menuSections.map(section => ({
        ...section,
        items: section.items.filter(item => hasPermission(user.rol, item.permission))
    })).filter(section => section.items.length > 0);

    // Flat list for mobile
    const allowedItems = flatMenuItems.filter(item => hasPermission(user.rol, item.permission));

    return (
        <>
            {/* SIDEBAR (Desktop) - Clean Light Modern with Sections */}
            <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-60 flex-col z-50 bg-white border-r border-slate-100 shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
                {/* Logo Section */}
                <div className="flex items-center gap-3 px-5 py-6 border-b border-slate-50">
                    <div className="relative w-10 h-10 shrink-0 rounded-xl overflow-hidden shadow-sm border border-slate-100">
                        <Image src="/images/logo-rodrigos.jpeg" alt="Rodrigo's" fill className="object-cover" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-slate-900 leading-none tracking-tight">Rodrigo&apos;s</h1>
                        <p className="text-[10px] text-rodrigo-terracotta font-bold uppercase tracking-wider mt-1">Brasas & Broasters</p>
                    </div>
                </div>

                {/* Navigation Menu with Sections */}
                <nav className="flex-1 py-4 px-3 overflow-y-auto no-scrollbar">
                    {filteredSections.map((section, sectionIndex) => (
                        <div key={section.title} className="mb-6">
                            {/* Divider between sections */}
                            {sectionIndex > 0 && (
                                <div className="mx-2 mb-5 h-px bg-slate-100" />
                            )}
                            {/* Section Title */}
                            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.15em] px-4 mb-3">
                                {section.title}
                            </p>
                            {/* Section Items */}
                            <div className="space-y-1">
                                {section.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link key={item.href} href={item.href}>
                                            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] transition-all duration-200 group ${isActive
                                                ? 'bg-rodrigo-terracotta text-white font-bold shadow-md shadow-rodrigo-terracotta/20 scale-[1.02]'
                                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-semibold'
                                                }`}>
                                                <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-rodrigo-terracotta transition-colors'} />
                                                <span>{item.label}</span>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* User Section */}
                <div className="border-t border-slate-50 p-4 bg-slate-50/30">
                    <div className="flex items-center gap-3 mb-4 p-2">
                        <div className="w-10 h-10 rounded-full bg-rodrigo-mustard/10 flex items-center justify-center text-rodrigo-mustard text-sm font-black border border-rodrigo-mustard/20 shadow-sm">
                            {user.nombre.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-900 truncate tracking-tight">{user.nombre}</p>
                            <p className="text-[10px] text-slate-400 capitalize font-bold">{user.rol}</p>
                        </div>
                    </div>
                    <button onClick={logout}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
                    >
                        <LogOut size={14} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* MOBILE HEADER - Clean Light */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-sm border border-slate-100">
                        <Image src="/images/logo-rodrigos.jpeg" alt="Logo" fill className="object-cover" />
                    </div>
                    <div className="leading-none">
                        <span className="font-black text-slate-900 text-sm block">Rodrigo&apos;s</span>
                        <span className="text-[9px] text-rodrigo-terracotta font-bold uppercase mt-0.5 block">Brasas & Broasters</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-rodrigo-mustard/10 flex items-center justify-center text-rodrigo-mustard text-xs font-black border border-rodrigo-mustard/20">
                        {user.nombre.charAt(0)}
                    </div>
                </div>
            </header>

            {/* MOBILE BOTTOM NAV - Clean Light */}
            <nav className="lg:hidden fixed bottom-6 left-4 right-4 z-50 bg-white/90 backdrop-blur-2xl border border-slate-200/50 flex items-center justify-around px-2 py-3 rounded-3xl shadow-2xl shadow-slate-200/50 safe-bottom">
                {allowedItems.slice(0, 5).map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 py-1 px-4 relative">
                            {isActive && (
                                <motion.div layoutId="nav-active" className="absolute inset-0 bg-rodrigo-terracotta/5 rounded-2xl" />
                            )}
                            <Icon size={20} className={isActive ? 'text-rodrigo-terracotta' : 'text-slate-400'} />
                            <span className={`text-[10px] font-black uppercase tracking-tighter ${isActive ? 'text-rodrigo-terracotta' : 'text-slate-400'}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
                {allowedItems.length > 5 && (
                    <button className="flex flex-col items-center gap-1 py-1 px-4 text-slate-400">
                        <Menu size={20} />
                        <span className="text-[10px] font-black uppercase tracking-tighter">Más</span>
                    </button>
                )}
            </nav>
        </>
    );
}
