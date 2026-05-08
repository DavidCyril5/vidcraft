import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, Download, MonitorOff, Loader2, Share2, Check, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { downloadVideo } from '@/lib/api-client';

interface VideoDisplayProps {
  status: 'idle' | 'generating' | 'completed' | 'error';
  videoUrl?: string;
  prompt?: string;
  onReset: () => void;
}

const TOTAL_SECONDS = 5 * 60;

function CountdownTimer({ active }: { active: boolean }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [active]);

  const remaining = Math.max(0, TOTAL_SECONDS - elapsed);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const pct = Math.min(100, (elapsed / TOTAL_SECONDS) * 100);

  const phase = elapsed < 240
    ? 'Initialising neural render...'
    : elapsed < 300
    ? 'Finalising your video...'
    : 'Almost there, polishing frames...';

  return (
    <div className="space-y-3 text-center w-full max-w-sm">
      <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full primary-gradient rounded-full transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
        <span className="animate-pulse">{phase}</span>
        {remaining > 0 ? (
          <span className="flex items-center gap-1 font-mono font-bold text-white/60">
            <Clock className="w-3 h-3" />{mins}:{secs.toString().padStart(2, '0')}
          </span>
        ) : (
          <span className="text-primary font-semibold">Checking result...</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">This typically takes 4–6 minutes. You can leave this tab open.</p>
    </div>
  );
}

export default function VideoDisplay({ status, videoUrl, prompt, onReset }: VideoDisplayProps) {
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    if (!videoUrl) return;
    setDownloading(true);
    try {
      await downloadVideo(videoUrl, prompt || 'video');
      toast({ title: 'Download started!', description: 'Your video is being saved.' });
    } catch (err: any) {
      toast({ title: 'Download failed', description: err.message, variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!videoUrl) return;
    try {
      await navigator.clipboard.writeText(videoUrl);
      setCopied(true);
      toast({ title: 'Link copied!', description: 'Share your video with anyone.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Could not copy link', variant: 'destructive' });
    }
  };

  if (status === 'idle') {
    return (
      <div className="glass-morphism border-dashed border-2 border-white/5 bg-transparent min-h-[300px] md:h-[420px] flex flex-col items-center justify-center p-8 text-center rounded-3xl">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
          <Play className="w-8 h-8 text-white/20" />
        </div>
        <h3 className="text-xl font-headline mb-2 text-white/40">Ready to Create?</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Describe your vision and let our AI models bring it to life.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-morphism overflow-hidden border border-white/10 shadow-2xl rounded-3xl lg:sticky lg:top-24">
      <div className="relative aspect-video bg-black/40 flex items-center justify-center overflow-hidden">
        {status === 'generating' ? (
          <div className="flex flex-col items-center gap-6 p-8 w-full">
            <div className="relative">
              <div className="absolute inset-0 primary-gradient blur-3xl opacity-20 animate-pulse rounded-2xl" />
              <div className="w-20 h-20 rounded-2xl primary-gradient flex items-center justify-center relative z-10 shadow-2xl shadow-primary/40">
                <Loader2 className="w-10 h-10 text-background animate-spin" />
              </div>
            </div>
            <p className="text-lg font-headline">Crafting your masterpiece...</p>
            <CountdownTimer active={status === 'generating'} />
          </div>
        ) : status === 'completed' && videoUrl ? (
          <video src={videoUrl} className="w-full h-full object-contain" controls autoPlay loop playsInline />
        ) : status === 'error' ? (
          <div className="flex flex-col items-center gap-4 text-center p-8">
            <div className="p-4 rounded-full bg-red-500/10">
              <MonitorOff className="w-10 h-10 text-red-400" />
            </div>
            <h3 className="text-xl font-headline">Generation stopped</h3>
            <p className="text-sm text-muted-foreground max-w-xs">Check the message above and try again. Your credit has been refunded.</p>
            <button onClick={onReset} className="mt-2 px-5 py-2 rounded-xl bg-white/10 border border-white/10 text-sm hover:bg-white/15 transition-colors">
              Try Again
            </button>
          </div>
        ) : null}
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-accent/80 px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/20">
            {status === 'completed' ? 'AI Generated' : status === 'generating' ? 'Processing...' : 'AI Generated'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              disabled={status !== 'completed'}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-medium hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Copy video link"
            >
              {copied ? <><Check className="w-3.5 h-3.5 text-green-400" />Copied!</> : <><Share2 className="w-3.5 h-3.5" />Share</>}
            </button>
            <button
              onClick={handleDownload}
              disabled={status !== 'completed' || downloading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-medium hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {downloading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</> : <><Download className="w-3.5 h-3.5" />Download</>}
            </button>
          </div>
        </div>

        {prompt && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Prompt</p>
            <p className="text-xs text-white/70 line-clamp-2 italic">"{prompt}"</p>
          </div>
        )}

        {status === 'completed' && (
          <div className="flex gap-2">
            <button onClick={onReset} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-medium hover:bg-white/10 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Generate Another
            </button>
            <a href="/history" className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-xs font-medium text-primary hover:bg-primary/15 transition-colors">
              View History
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
