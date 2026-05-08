"use client";

import React from 'react';
import { Play, RotateCcw, Download, Share2, Clock, MonitorOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface VideoDisplayProps {
  status: 'idle' | 'generating' | 'completed' | 'error';
  videoUrl?: string;
  prompt?: string;
  onReset: () => void;
}

export default function VideoDisplay({ status, videoUrl, prompt, onReset }: VideoDisplayProps) {
  if (status === 'idle') {
    return (
      <Card className="glass-morphism border-dashed border-2 border-white/5 bg-transparent min-h-[300px] md:h-[400px] flex flex-col items-center justify-center p-6 md:p-8 text-center">
        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 md:mb-6">
          <Play className="w-6 h-6 md:w-8 md:h-8 text-white/20" />
        </div>
        <h3 className="text-lg md:text-xl font-headline mb-2 text-white/40">Ready to Create?</h3>
        <p className="text-sm md:text-base text-muted-foreground max-w-xs px-4">
          Input your prompt and start generating high-quality AI videos instantly.
        </p>
      </Card>
    );
  }

  return (
    <Card className="glass-morphism overflow-hidden border-none shadow-2xl lg:sticky lg:top-24">
      <div className="relative aspect-video bg-black/40 flex items-center justify-center overflow-hidden">
        {status === 'generating' ? (
          <div className="flex flex-col items-center gap-4 md:gap-6 p-6 md:p-8 w-full">
            <div className="relative">
              <div className="absolute inset-0 primary-gradient blur-3xl opacity-20 animate-pulse-glow" />
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl primary-gradient animate-bounce flex items-center justify-center relative z-10">
                <Clock className="w-8 h-8 md:w-10 md:h-10 text-background" />
              </div>
            </div>
            <div className="space-y-3 text-center w-full max-w-sm">
              <div className="h-1.5 md:h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full primary-gradient w-1/3 animate-[progress_30s_infinite_linear]" />
              </div>
              <p className="text-base md:text-lg font-headline animate-pulse">Crafting masterpiece...</p>
              <p className="text-[10px] md:text-xs text-muted-foreground px-4">
                Our AI models are processing your prompt and assets to generate a unique sequence.
              </p>
            </div>
          </div>
        ) : status === 'completed' && videoUrl ? (
          <video
            src={videoUrl}
            className="w-full h-full object-contain"
            controls
            autoPlay
            loop
          />
        ) : status === 'error' ? (
          <div className="flex flex-col items-center gap-4 text-center p-6 md:p-8">
            <div className="p-3 md:p-4 rounded-full bg-destructive/10">
              <MonitorOff className="w-8 h-8 md:w-10 md:h-10 text-destructive" />
            </div>
            <h3 className="text-lg md:text-xl font-headline">Something went wrong</h3>
            <p className="text-xs md:text-sm text-muted-foreground">The AI engine encountered an error. Please try adjusting your prompt or model.</p>
            <Button variant="outline" onClick={onReset} className="mt-2 h-9 text-xs md:text-sm">Try Again</Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center p-6 md:p-8">
             <Skeleton className="w-full h-full absolute inset-0 rounded-none" />
             <div className="relative z-10">
               <p className="text-white/60 text-sm">Generation initiated</p>
               <p className="text-[10px] text-white/40 mt-1 italic px-4">Note: Real-time preview is limited in this beta version.</p>
               <Button variant="outline" size="sm" onClick={onReset} className="mt-4 gap-2 h-8 text-xs">
                 <RotateCcw className="w-3.5 h-3.5" /> Reset UI
               </Button>
             </div>
          </div>
        )}
      </div>

      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="bg-[#8AB2F0]/20 text-[#8AB2F0] border-none px-2.5 py-0.5 text-[10px] md:text-xs">
            Beta Generation
          </Badge>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={status !== 'completed'}>
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={status !== 'completed'}>
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {prompt && (
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Prompt Used</h4>
            <p className="text-xs md:text-sm text-white/80 line-clamp-3 italic">"{prompt}"</p>
          </div>
        )}

        {status === 'completed' && (
          <Button onClick={onReset} variant="outline" className="w-full gap-2 text-[10px] md:text-xs h-8">
            <RotateCcw className="w-3 h-3" /> Start Over
          </Button>
        )}
      </div>

      <style jsx global>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </Card>
  );
}
