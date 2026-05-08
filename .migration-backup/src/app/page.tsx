"use client";

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import GenerationForm from '@/components/GenerationForm';
import VideoDisplay from '@/components/VideoDisplay';
import DevLogsPanel from '@/components/DevLogsPanel';
import { Toaster } from '@/components/ui/toaster';
import { logger } from '@/lib/logger';
import { Sparkles, Zap, Shield, PlayCircle, Video as LucideVideo } from 'lucide-react';

export default function Home() {
  const [genStatus, setGenStatus] = useState<'idle' | 'generating' | 'completed' | 'error'>('idle');
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | undefined>();
  const [lastPrompt, setLastPrompt] = useState<string | undefined>();

  useEffect(() => {
    logger.info("Application initialized. Ready for creative flow.");
  }, []);

  const handleGenerateStart = (values: any) => {
    logger.debug("Generation sequence initiated", { 
      model: values.model, 
      ratio: values.ratio,
      hasStartImage: !!values.imageUrl,
      hasEndImage: !!values.endImageUrl
    });
    setGenStatus('generating');
    setLastPrompt(values.prompt);
    setCurrentVideoUrl(undefined);
  };

  const handleGenerateComplete = (videoUrl: string) => {
    logger.success("Video generation successful", { url: videoUrl });
    setCurrentVideoUrl(videoUrl);
    setGenStatus('completed');
  };

  const handleGenerateError = () => {
    logger.error("Video generation failed at engine level");
    setGenStatus('error');
  };

  const handleReset = () => {
    logger.info("Session reset. Returning to idle state.");
    setGenStatus('idle');
    setCurrentVideoUrl(undefined);
    setLastPrompt(undefined);
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-background pb-10">
      <div className="absolute top-[-10%] left-[-10%] w-[60%] md:w-[40%] h-[40%] bg-primary/20 blur-[100px] md:blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] md:w-[40%] h-[40%] bg-accent/20 blur-[100px] md:blur-[150px] pointer-events-none rounded-full" />

      <Navbar />

      <main className="flex-grow container mx-auto px-4 py-8 md:py-16 relative z-10 max-w-7xl">
        <header className="text-center mb-10 md:mb-20 space-y-4 px-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] md:text-xs font-semibold tracking-wider text-primary uppercase animate-fade-in">
            <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5" />
            Next-Gen AI Video Engine
          </div>
          <h1 className="text-4xl md:text-8xl font-bold tracking-tight text-white animate-slide-up leading-[1.1]">
            Dream in <span className="text-gradient">Motion</span>
          </h1>
          <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto animate-slide-up [animation-delay:100ms] leading-relaxed">
            VidCraft AI transforms your ideas into cinematic realities with advanced neural models.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
          {/* Form Side - Order 1 on mobile */}
          <div className="lg:col-span-5 animate-slide-up [animation-delay:200ms] order-1">
            <GenerationForm 
              onGenerateStart={handleGenerateStart} 
              onGenerateComplete={handleGenerateComplete}
              onGenerateError={handleGenerateError}
            />
            
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl glass-morphism space-y-2 border border-white/5">
                <Zap className="w-5 h-5 text-primary" />
                <h4 className="font-bold text-xs md:text-sm">Instant Flow</h4>
                <p className="text-[10px] md:text-xs text-muted-foreground leading-relaxed">Rapid sequence generation in seconds.</p>
              </div>
              <div className="p-5 rounded-2xl glass-morphism space-y-2 border border-white/5">
                <Shield className="w-5 h-5 text-accent" />
                <h4 className="font-bold text-xs md:text-sm">HD Fidelity</h4>
                <p className="text-[10px] md:text-xs text-muted-foreground leading-relaxed">Studio quality output by default.</p>
              </div>
            </div>
          </div>

          {/* Display Side - Order 2 on mobile */}
          <div className="lg:col-span-7 animate-slide-up [animation-delay:300ms] order-2">
            <VideoDisplay 
              status={genStatus} 
              videoUrl={currentVideoUrl} 
              prompt={lastPrompt}
              onReset={handleReset} 
            />
            
            <div className="mt-6 md:mt-10 p-6 md:p-8 rounded-3xl glass-morphism flex flex-col md:flex-row items-center gap-6 border border-white/5">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-background overflow-hidden ring-2 ring-white/5">
                    <img 
                      src={`https://picsum.photos/seed/user${i}/100/100`} 
                      alt="User" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                ))}
              </div>
              <div className="text-center md:text-left flex-grow">
                <p className="text-sm md:text-base font-semibold">Join <span className="text-primary">2,500+</span> elite creators</p>
                <p className="text-xs text-muted-foreground mt-0.5">Producing 10k+ videos daily on VidCraft AI.</p>
              </div>
              <button className="text-xs md:text-sm font-bold flex items-center gap-2 text-primary hover:text-primary/80 transition-all px-4 py-2 rounded-xl bg-primary/5 border border-primary/10">
                <PlayCircle className="w-4 h-4" />
                Showcase
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/5 py-16 bg-background/50 backdrop-blur-xl relative z-10">
        <div className="container mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 primary-gradient rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <LucideVideo className="w-5 h-5 text-background" />
              </div>
              <span className="text-xl font-headline font-bold text-gradient">VidCraft AI</span>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              Leading the revolution in generative visual storytelling with accessible AI tools.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 md:col-span-3">
            <div className="space-y-4">
              <h5 className="font-bold text-sm tracking-wider uppercase text-white">Engine</h5>
              <ul className="space-y-2 text-xs md:text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-all">WAN 2.2</a></li>
                <li><a href="#" className="hover:text-primary transition-all">Veo 3.1</a></li>
                <li><a href="#" className="hover:text-primary transition-all">Grok Video</a></li>
                <li><a href="#" className="hover:text-primary transition-all">API Access</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h5 className="font-bold text-sm tracking-wider uppercase text-white">Community</h5>
              <ul className="space-y-2 text-xs md:text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-all">Discord</a></li>
                <li><a href="#" className="hover:text-primary transition-all">Twitter</a></li>
                <li><a href="#" className="hover:text-primary transition-all">Roadmap</a></li>
                <li><a href="#" className="hover:text-primary transition-all">Support</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] md:text-xs text-muted-foreground uppercase tracking-[0.2em] font-bold">
          <span>&copy; 2024 VidCraft AI. Next-Gen Creativity.</span>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Legal</a>
          </div>
        </div>
      </footer>

      <DevLogsPanel />
      <Toaster />

      <style jsx global>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 1s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}
