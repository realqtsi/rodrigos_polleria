'use client';

import { useState } from 'react';
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/contexts/AuthContext";
import { usePathname } from "next/navigation";
import OfflineIndicator from '@/components/OfflineIndicator';

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <html lang="es">
      <head>
        <title>Rodrigo&apos;s - Brasas &amp; Broasters Chicken - Sistema POS</title>
        <meta name="description" content="Sistema de Punto de Venta para Rodrigo's" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-[#f8fafc] text-slate-900`}>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#ffffff',
                color: '#0f172a',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              },
              success: {
                iconTheme: { primary: '#16a34a', secondary: '#ffffff' },
              },
              error: {
                iconTheme: { primary: '#dc2626', secondary: '#ffffff' },
                style: { borderColor: '#fecaca' },
              },
            }}
          />
          <OfflineIndicator />
          {isLoginPage ? (
            <main className="min-h-screen w-full overflow-x-hidden">{children}</main>
          ) : (
            <div id="app-root" className="flex min-h-screen w-full overflow-x-hidden bg-[#f8fafc]">
              <div className="print:hidden">
                <Navbar />
              </div>
              <div className="flex-1 flex flex-col min-h-screen w-full lg:pl-60 relative">
                <main className="flex-1 w-full max-w-[100vw] p-4 sm:p-6 lg:p-8 pt-20 lg:pt-6 pb-24 lg:pb-8">
                  {children}
                </main>
              </div>
            </div>
          )}
        </AuthProvider>
      </body>
    </html>
  );
}
