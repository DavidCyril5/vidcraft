import React from 'react';
import { Video as LucideVideo, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-primary/8 blur-[160px] pointer-events-none rounded-full" />
      <div className="relative z-10 text-center space-y-6">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 primary-gradient rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
            <LucideVideo className="w-6 h-6 text-background" />
          </div>
          <span className="text-2xl font-headline font-bold text-gradient">VidCraft AI</span>
        </div>
        <h1 className="text-8xl font-headline font-bold text-white/10">404</h1>
        <h2 className="text-2xl font-headline font-bold text-white">Page not found</h2>
        <p className="text-muted-foreground max-w-sm mx-auto">
          This page doesn't exist. Head back to start creating videos.
        </p>
        <a href="/" className="inline-flex items-center gap-2 px-6 py-3 primary-gradient text-background font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-all text-sm">
          <ArrowLeft className="w-4 h-4" />Back to Generator
        </a>
      </div>
    </div>
  );
}
