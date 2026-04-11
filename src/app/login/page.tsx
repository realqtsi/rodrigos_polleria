'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Loader2, ArrowRight, ChefHat, ShieldCheck } from 'lucide-react';

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

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', background: '#1c1917' }}>
            {/* Fondo con gradientes animados */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
                    transition={{ duration: 10, repeat: Infinity }}
                    style={{ position: 'absolute', top: '-20%', left: '-10%', width: '60%', height: '60%', background: 'rgba(154,52,18,0.25)', borderRadius: '50%', filter: 'blur(120px)' }}
                />
                <motion.div
                    animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.25, 0.1] }}
                    transition={{ duration: 12, repeat: Infinity, delay: 1 }}
                    style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '60%', height: '60%', background: 'rgba(251,191,36,0.15)', borderRadius: '50%', filter: 'blur(120px)' }}
                />
            </div>

            {/* Contenedor principal */}
            <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '80px', padding: '24px', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>

                {/* Lado Izquierdo - Branding (solo desktop) */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    className="hidden lg:flex"
                    style={{ flexDirection: 'column', maxWidth: '520px' }}
                >
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 1 }}
                        style={{ marginBottom: '32px' }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/images/logo-rodrigos.jpeg"
                            alt="Rodrigo's - Brasas & Broasters"
                            style={{
                                width: '420px',
                                height: 'auto',
                                borderRadius: '2rem',
                                boxShadow: '0 35px 60px -15px rgba(0,0,0,0.6)',
                                border: '4px solid rgba(251,191,36,0.3)',
                            }}
                        />
                    </motion.div>

                    <h1 style={{ fontSize: '3.5rem', fontWeight: 900, color: 'white', marginBottom: '20px', lineHeight: 1.1 }}>
                        Sabor que <br />
                        <span style={{ color: '#fbbf24' }}>Enamora</span>
                    </h1>

                    <p style={{ fontSize: '1.15rem', color: '#a8a29e', marginBottom: '32px', maxWidth: '360px', fontWeight: 500, lineHeight: 1.6 }}>
                        Gestión inteligente para los mejores brasas y broasters de la ciudad.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ padding: '8px', background: '#9a3412', borderRadius: '8px' }}>
                                <ChefHat color="white" size={20} />
                            </div>
                            <div>
                                <p style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>Control Total</p>
                                <p style={{ fontSize: '12px', color: '#78716c' }}>Cocina & Ventas</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ padding: '8px', background: '#fbbf24', borderRadius: '8px' }}>
                                <ShieldCheck color="#431407" size={20} />
                            </div>
                            <div>
                                <p style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>Seguridad</p>
                                <p style={{ fontSize: '12px', color: '#78716c' }}>Acceso Protegido</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Formulario de Login */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    style={{ width: '100%', maxWidth: '440px' }}
                >
                    <div style={{
                        background: 'rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(40px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                        padding: '48px',
                        borderRadius: '2.5rem',
                        border: '1px solid rgba(255,255,255,0.15)',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                        position: 'relative',
                        overflow: 'hidden',
                    }}>
                        {/* Glow superior */}
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(to right, transparent, rgba(251,191,36,0.5), transparent)' }} />

                        {/* Logo mobile */}
                        <div className="lg:hidden" style={{ textAlign: 'center', marginBottom: '32px' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/images/logo-rodrigos.jpeg"
                                alt="Rodrigo's"
                                style={{
                                    width: '200px',
                                    height: 'auto',
                                    borderRadius: '1.5rem',
                                    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)',
                                    border: '3px solid rgba(251,191,36,0.3)',
                                    margin: '0 auto',
                                    display: 'block',
                                }}
                            />
                        </div>

                        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white', marginBottom: '8px', letterSpacing: '-0.5px' }}>Acceso al Sistema</h2>
                            <p style={{ color: '#a8a29e', fontWeight: 500, fontSize: '0.9rem' }}>Inicia sesión con tu cuenta</p>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <AnimatePresence mode="wait">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        style={{
                                            background: 'rgba(239,68,68,0.1)',
                                            border: '1px solid rgba(239,68,68,0.4)',
                                            color: '#fca5a5',
                                            padding: '12px 16px',
                                            borderRadius: '12px',
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                        }}
                                    >
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Email */}
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', marginLeft: '4px' }}>
                                    Email Corporativo
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Mail style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#78716c' }} size={20} />
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="ejemplo@rodrigos.com"
                                        required
                                        style={{
                                            width: '100%',
                                            paddingLeft: '48px',
                                            paddingRight: '16px',
                                            paddingTop: '16px',
                                            paddingBottom: '16px',
                                            background: 'rgba(0,0,0,0.25)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '16px',
                                            color: 'white',
                                            fontSize: '15px',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', marginLeft: '4px' }}>
                                    Contraseña
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Lock style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#78716c' }} size={20} />
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
                                            paddingLeft: '48px',
                                            paddingRight: '16px',
                                            paddingTop: '16px',
                                            paddingBottom: '16px',
                                            background: 'rgba(0,0,0,0.25)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '16px',
                                            color: 'white',
                                            fontSize: '15px',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    marginTop: '8px',
                                    background: loading ? '#78716c' : 'linear-gradient(135deg, #9a3412, #c2410c)',
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: '16px',
                                    borderRadius: '16px',
                                    border: 'none',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '12px',
                                    boxShadow: '0 10px 25px -8px rgba(154,52,18,0.5)',
                                    opacity: loading ? 0.7 : 1,
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={22} />
                                        <span>Validando Acceso...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Entrar al Sistema</span>
                                        <ArrowRight size={22} />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Footer */}
                        <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                            <p style={{ color: '#78716c', fontSize: '12px', fontWeight: 500 }}>
                                © 2026 Rodrigo&apos;s - Brasas & Broasters Chicken <br />
                                <span style={{ opacity: 0.5 }}>Desarrollado por JoseAT</span>
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
