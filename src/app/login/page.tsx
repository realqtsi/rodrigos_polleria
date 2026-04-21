'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Loader2, ArrowRight, Zap, Shield, BarChart3, Globe } from 'lucide-react';

// Logo SVG de KODIFY tech inline
function KodifyLogo({ size = 48 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="kodifyGrad" x1="0" y1="0" x2="64" y2="64">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
                <linearGradient id="kodifyGrad2" x1="0" y1="0" x2="64" y2="64">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#c4b5fd" />
                </linearGradient>
            </defs>
            <rect width="64" height="64" rx="16" fill="url(#kodifyGrad)" />
            {/* K shape */}
            <path d="M20 16L20 48" stroke="white" strokeWidth="5" strokeLinecap="round" />
            <path d="M20 32L38 16" stroke="white" strokeWidth="5" strokeLinecap="round" />
            <path d="M20 32L38 48" stroke="url(#kodifyGrad2)" strokeWidth="5" strokeLinecap="round" />
            {/* Code brackets */}
            <path d="M42 20L48 32L42 44" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const cleanEmail = email.trim();
        const cleanPassword = password;

        if (!cleanEmail || !cleanPassword) {
            setError('Por favor, complete todos los campos.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const success = await login(cleanEmail, cleanPassword);
            if (success) {
                router.push('/');
            } else {
                setError('Credenciales incorrectas. Verifique su correo y contraseña.');
            }
        } catch (err: any) {
            console.error('[LoginPage] Error:', err);
            setError(err.message || 'Error al conectar con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    const features = [
        { icon: Zap, title: 'Rendimiento', desc: 'Operaciones en tiempo real' },
        { icon: Shield, title: 'Seguridad', desc: 'Aislamiento por tenant' },
        { icon: BarChart3, title: 'Analytics', desc: 'Métricas por negocio' },
        { icon: Globe, title: 'Multi-tenant', desc: 'Escala sin límites' },
    ];

    return (
        <div style={{ minHeight: '100vh', display: 'flex', position: 'relative', overflow: 'hidden', background: '#0a0a0f' }}>

            {/* Fondo con gradientes animados */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.08, 0.15, 0.08] }}
                    transition={{ duration: 15, repeat: Infinity }}
                    style={{ position: 'absolute', top: '-30%', left: '-20%', width: '80%', height: '80%', background: 'rgba(99,102,241,0.3)', borderRadius: '50%', filter: 'blur(150px)' }}
                />
                <motion.div
                    animate={{ scale: [1.2, 1, 1.2], opacity: [0.06, 0.12, 0.06] }}
                    transition={{ duration: 18, repeat: Infinity, delay: 2 }}
                    style={{ position: 'absolute', bottom: '-30%', right: '-20%', width: '80%', height: '80%', background: 'rgba(139,92,246,0.2)', borderRadius: '50%', filter: 'blur(150px)' }}
                />
                <motion.div
                    animate={{ scale: [1, 1.1, 1], opacity: [0.05, 0.1, 0.05] }}
                    transition={{ duration: 12, repeat: Infinity, delay: 4 }}
                    style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', width: '50%', height: '50%', background: 'rgba(168,85,247,0.15)', borderRadius: '50%', filter: 'blur(120px)' }}
                />
                {/* Grid pattern */}
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '60px 60px', opacity: 0.5 }} />
            </div>

            {/* Layout principal */}
            <div style={{ position: 'relative', zIndex: 10, display: 'flex', width: '100%', minHeight: '100vh' }}>

                {/* Lado Izquierdo - Branding KODIFY (solo desktop) */}
                <motion.div
                    initial={{ opacity: 0, x: -60 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="hidden lg:flex"
                    style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', padding: '80px', maxWidth: '600px' }}
                >
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                        style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '48px' }}
                    >
                        <KodifyLogo size={56} />
                        <div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white', letterSpacing: '-1px', lineHeight: 1 }}>KODIFY</h2>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#818cf8', letterSpacing: '0.2em', textTransform: 'uppercase' }}>tech</span>
                        </div>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.6 }}
                        style={{ fontSize: '3.2rem', fontWeight: 900, color: 'white', marginBottom: '24px', lineHeight: 1.1, letterSpacing: '-1.5px' }}
                    >
                        Gestión de<br />
                        negocios{' '}
                        <span style={{ background: 'linear-gradient(135deg, #818cf8, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            inteligente
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.6 }}
                        style={{ fontSize: '1.1rem', color: '#6b7280', marginBottom: '48px', maxWidth: '400px', fontWeight: 500, lineHeight: 1.7 }}
                    >
                        Plataforma SaaS que potencia restaurantes con tecnología de punta. Un solo sistema, múltiples negocios.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7, duration: 0.6 }}
                        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}
                    >
                        {features.map((f, i) => (
                            <motion.div
                                key={f.title}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.8 + i * 0.1, duration: 0.4 }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    background: 'rgba(255,255,255,0.03)',
                                    backdropFilter: 'blur(12px)',
                                    padding: '14px 16px', borderRadius: '14px',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                }}
                            >
                                <div style={{ padding: '8px', background: 'rgba(99,102,241,0.15)', borderRadius: '10px', flexShrink: 0 }}>
                                    <f.icon color="#818cf8" size={18} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{f.title}</p>
                                    <p style={{ fontSize: '11px', color: '#4b5563' }}>{f.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>

                {/* Lado Derecho - Formulario */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        style={{ width: '100%', maxWidth: '420px' }}
                    >
                        <div style={{
                            background: 'rgba(255,255,255,0.04)',
                            backdropFilter: 'blur(40px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                            padding: '48px 40px',
                            borderRadius: '2rem',
                            border: '1px solid rgba(255,255,255,0.08)',
                            boxShadow: '0 25px 60px -15px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
                            position: 'relative',
                            overflow: 'hidden',
                        }}>
                            {/* Línea superior decorativa */}
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(to right, transparent, #6366f1, #a78bfa, transparent)' }} />

                            {/* Logo mobile */}
                            <div className="lg:hidden" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginBottom: '36px' }}>
                                <KodifyLogo size={44} />
                                <div>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white', letterSpacing: '-0.5px', lineHeight: 1 }}>KODIFY</h2>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#818cf8', letterSpacing: '0.2em', textTransform: 'uppercase' }}>tech</span>
                                </div>
                            </div>

                            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white', marginBottom: '8px', letterSpacing: '-0.5px' }}>Bienvenido</h2>
                                <p style={{ color: '#6b7280', fontWeight: 500, fontSize: '0.85rem' }}>Ingresa tus credenciales para continuar</p>
                            </div>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                <AnimatePresence mode="wait">
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            style={{
                                                background: 'rgba(239,68,68,0.08)',
                                                border: '1px solid rgba(239,68,68,0.25)',
                                                color: '#fca5a5',
                                                padding: '12px 16px',
                                                borderRadius: '12px',
                                                fontSize: '13px',
                                                fontWeight: 500,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                            }}
                                        >
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                                            {error}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Email */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', marginLeft: '4px' }}>
                                        Email
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <Mail style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} size={18} />
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="tu@correo.com"
                                            required
                                            style={{
                                                width: '100%',
                                                paddingLeft: '46px',
                                                paddingRight: '16px',
                                                paddingTop: '14px',
                                                paddingBottom: '14px',
                                                background: 'rgba(255,255,255,0.04)',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                borderRadius: '14px',
                                                color: 'white',
                                                fontSize: '14px',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                                transition: 'border 0.2s',
                                            }}
                                            onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', marginLeft: '4px' }}>
                                        Contraseña
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <Lock style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} size={18} />
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            autoComplete="current-password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            style={{
                                                width: '100%',
                                                paddingLeft: '46px',
                                                paddingRight: '16px',
                                                paddingTop: '14px',
                                                paddingBottom: '14px',
                                                background: 'rgba(255,255,255,0.04)',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                borderRadius: '14px',
                                                color: 'white',
                                                fontSize: '14px',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                                transition: 'border 0.2s',
                                            }}
                                            onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                                        />
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        width: '100%',
                                        padding: '15px',
                                        marginTop: '8px',
                                        background: loading ? '#374151' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                        color: 'white',
                                        fontWeight: 700,
                                        fontSize: '15px',
                                        borderRadius: '14px',
                                        border: 'none',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        boxShadow: loading ? 'none' : '0 10px 30px -8px rgba(99,102,241,0.4)',
                                        opacity: loading ? 0.7 : 1,
                                        transition: 'all 0.3s ease',
                                    }}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="animate-spin" size={20} />
                                            <span>Verificando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Iniciar Sesión</span>
                                            <ArrowRight size={20} />
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Footer */}
                            <div style={{ marginTop: '36px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                                <p style={{ color: '#374151', fontSize: '11px', fontWeight: 500, lineHeight: 1.6 }}>
                                    Potenciado por <span style={{ color: '#818cf8', fontWeight: 700 }}>KODIFY tech</span><br />
                                    <span style={{ opacity: 0.5 }}>© 2026 — Plataforma SaaS</span>
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
