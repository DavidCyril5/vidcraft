import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import GenerationForm from '@/components/GenerationForm';
import VideoDisplay from '@/components/VideoDisplay';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, Zap, Shield, PlayCircle, Video as LucideVideo, Crown, Pen, Cpu, Download } from 'lucide-react';

export default function Home() {
  const [genStatus, setGenStatus] = useState<'idle' | 'generating' | 'completed' | 'error'>('idle');
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | undefined>();
  const [lastPrompt, setLastPrompt] = useState<string | undefined>();
  const [waitMins, setWaitMins] = useState<number>(5);
  const { user } = useAuth();

  const MODEL_WAIT: Record<string, number> = {
    'wan-2.2': 2, 'veo-3.1': 7, 'grok-video': 5, 'seedance-2.0': 10,
  };

  const handleGenerateStart = (values: any) => {
    setGenStatus('generating');
    setLastPrompt(values.prompt);
    setCurrentVideoUrl(undefined);
    setWaitMins(MODEL_WAIT[values.model] ?? 5);
  };

  const handleGenerateComplete = (videoUrl: string) => {
    setCurrentVideoUrl(videoUrl);
    setGenStatus('completed');
  };

  const handleGenerateError = () => setGenStatus('error');

  const handleReset = () => {
    setGenStatus('idle');
    setCurrentVideoUrl(undefined);
    setLastPrompt(undefined);
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-background pb-16">
      <div className="absolute top-[-10%] left-[-10%] w-[60%] md:w-[40%] h-[40%] bg-primary/15 blur-[120px] md:blur-[160px] pointer-events-none rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] md:w-[40%] h-[40%] bg-accent/15 blur-[120px] md:blur-[160px] pointer-events-none rounded-full" />

      <Navbar />

      <main className="flex-grow container mx-auto px-4 py-8 md:py-16 relative z-10 max-w-7xl">
        <header className="text-center mb-10 md:mb-16 space-y-5 px-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] md:text-xs font-semibold tracking-wider text-primary uppercase">
            <Sparkles className="w-3.5 h-3.5" />Next-Gen AI Video Engine
          </div>
          <h1 className="text-5xl md:text-8xl font-bold font-headline tracking-tight text-white leading-[1.05]">
            Dream in <span className="text-gradient">Motion</span>
          </h1>
          <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            VidCraft AI transforms your ideas into cinematic realities with advanced neural models — Veo 3.1, Wan 2.2, Grok Video, and Seedance 2.0.
          </p>
          {!user && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <a href="/signup" className="h-12 px-8 primary-gradient text-background font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4" />Start Free — 3 Credits
              </a>
              <a href="/pricing" className="h-12 px-6 rounded-2xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-all flex items-center gap-2">
                <Crown className="w-4 h-4 text-yellow-400" />View Plans
              </a>
            </div>
          )}
        </header>

        {!user && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {[
              { icon: Pen, num: '01', title: 'Write a Prompt', desc: 'Describe your scene in plain English. Use our AI enhancer or pick from prompt templates to get the perfect idea.' },
              { icon: Cpu, num: '02', title: 'Choose a Model', desc: 'Pick from 4 world-class AI models. Wan 2.2 is free. Veo 3.1, Grok Video, and Seedance 2.0 on paid plans.' },
              { icon: Download, num: '03', title: 'Download & Share', desc: 'Your video is ready in 3–6 minutes. Download as MP4, share the link, or save to your video history.' },
            ].map(step => (
              <div key={step.num} className="glass-morphism rounded-2xl p-6 border border-white/8 flex gap-4">
                <div className="shrink-0">
                  <div className="w-10 h-10 rounded-xl primary-gradient flex items-center justify-center">
                    <step.icon className="w-4 h-4 text-background" />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase mb-1">Step {step.num}</p>
                  <h3 className="font-bold text-white mb-1">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-5 space-y-6">
            <GenerationForm
              onGenerateStart={handleGenerateStart}
              onGenerateComplete={handleGenerateComplete}
              onGenerateError={handleGenerateError}
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl glass-morphism space-y-2 border border-white/5">
                <Zap className="w-5 h-5 text-primary" />
                <h4 className="font-bold text-sm">4 AI Models</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">Veo 3.1, Wan 2.2, Grok Video, Seedance 2.0.</p>
              </div>
              <div className="p-5 rounded-2xl glass-morphism space-y-2 border border-white/5">
                <Shield className="w-5 h-5 text-accent" />
                <h4 className="font-bold text-sm">HD Fidelity</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">Studio quality output by default.</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <VideoDisplay
              status={genStatus}
              videoUrl={currentVideoUrl}
              prompt={lastPrompt}
              onReset={handleReset}
              waitMins={waitMins}
            />
            <div className="mt-6 p-6 rounded-3xl glass-morphism flex flex-col sm:flex-row items-center gap-5 border border-white/5">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-background overflow-hidden ring-2 ring-white/5">
                    <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div className="text-center sm:text-left flex-grow">
                <p className="text-sm font-semibold">Join <span className="text-primary">2,500+</span> creators</p>
                <p className="text-xs text-muted-foreground mt-0.5">Producing thousands of videos daily.</p>
              </div>
              <a href="/pricing" className="text-xs font-bold flex items-center gap-2 text-primary hover:text-primary/80 transition-all px-4 py-2 rounded-xl bg-primary/5 border border-primary/10 shrink-0">
                <PlayCircle className="w-4 h-4" />See Plans
              </a>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/5 py-12 bg-background/50 backdrop-blur-xl relative z-10">
        <div className="container mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 primary-gradient rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <LucideVideo className="w-4 h-4 text-background" />
              </div>
              <span className="text-xl font-headline font-bold text-gradient">VidCraft AI</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Leading the revolution in AI-powered visual storytelling. Made in Nigeria.
            </p>
          </div>
          <div className="space-y-3">
            <h5 className="font-bold text-xs tracking-wider uppercase text-white">Models</h5>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><a href="/" className="hover:text-primary transition-all">Wan 2.2 (Free)</a></li>
              <li><a href="/pricing" className="hover:text-primary transition-all">Veo 3.1 (Pro)</a></li>
              <li><a href="/pricing" className="hover:text-primary transition-all">Grok Video (Pro)</a></li>
              <li><a href="/pricing" className="hover:text-primary transition-all">Seedance 2.0 (Pro)</a></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h5 className="font-bold text-xs tracking-wider uppercase text-white">Account</h5>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><a href="/signup" className="hover:text-primary transition-all">Sign Up Free</a></li>
              <li><a href="/login" className="hover:text-primary transition-all">Sign In</a></li>
              <li><a href="/pricing" className="hover:text-primary transition-all">Pricing</a></li>
              <li><a href="/dashboard" className="hover:text-primary transition-all">Dashboard</a></li>
              <li><a href="/history" className="hover:text-primary transition-all">Video History</a></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h5 className="font-bold text-xs tracking-wider uppercase text-white">Company</h5>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><a href="/contact" className="hover:text-primary transition-all">Contact Support</a></li>
              <li><a href="/terms" className="hover:text-primary transition-all">Terms of Service</a></li>
              <li><a href="/pricing#faq" className="hover:text-primary transition-all">FAQ</a></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-10 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">
          <span>&copy; 2025 VidCraft AI. All rights reserved.</span>
          <span>Payments secured by Paystack · Naira (₦) · Made in Nigeria 🇳🇬</span>
        </div>
      </footer>
    </div>
  );
}
