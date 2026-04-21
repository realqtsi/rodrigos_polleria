'use client';

import React from 'react';

interface KodifyLogoProps {
    size?: number;
    showText?: boolean;
    light?: boolean;
}

export default function KodifyLogo({ size = 48, showText = false, light = false }: KodifyLogoProps) {
    return (
        <div className="flex items-center gap-3">
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
            {showText && (
                <div>
                    <h2 className={`font-black tracking-tighter leading-none ${light ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: size * 0.45 }}>KODIFY</h2>
                    <span className={`font-bold tracking-[0.2em] uppercase ${light ? 'text-indigo-300' : 'text-indigo-600'}`} style={{ fontSize: size * 0.18 }}>tech</span>
                </div>
            )}
        </div>
    );
}
