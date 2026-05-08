import React, { useEffect, useState, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Video, Download, Trash2, Loader2, Play, RefreshCw, ChevronLeft, ChevronRight, Heart, Copy, RotateCcw, Search, Filter, X } from 'lucide-react';
import { getVideoHistory, deleteVideo, downloadVideo, toggleFavorite } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

interface VideoItem {
  _id: string;
  prompt: string;
  model: string;
  ratio: string;
  videoUrl: string;
  isFavorited: boolean;
  createdAt: string;
}

const MODEL_LABELS: Record<string, string> = {
  'wan-2.2': 'Wan 2.2', 'veo-3.1': 'Veo 3.1', 'grok-video': 'Grok Video', 'seedance-2.0': 'Seedance 2.0',
};
const MODEL_COLORS: Record<string, string> = {
  'wan-2.2': 'text-green-400 bg-green-400/10 border-green-400/20',
  'veo-3.1': 'text-primary bg-primary/10 border-primary/20',
  'grok-video': 'text-accent bg-accent/10 border-accent/20',
  'seedance-2.0': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
};

export default function HistoryPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [favoritingId, setFavoritingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modelFilter, setModelFilter] = useState('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  useEffect(() => { if (!user) navigate('/login'); }, [user]);

  const load = useCallback(async (p = 1, s = search, m = modelFilter, f = favoritesOnly) => {
    setLoading(true);
    try {
      const data = await getVideoHistory(p, 20, { search: s || undefined, model: m, favorites: f });
      setVideos(data.videos);
      setTotal(data.total);
      setTotalPages(data.pages);
      setPage(p);
    } catch {
      toast({ title: 'Could not load history', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [search, modelFilter, favoritesOnly]);

  useEffect(() => { if (user) load(1); }, [user]);

  const applyFilters = () => load(1, search, modelFilter, favoritesOnly);
  const clearFilters = () => {
    setSearch(''); setModelFilter('all'); setFavoritesOnly(false);
    load(1, '', 'all', false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteVideo(id);
      setVideos(v => v.filter(x => x._id !== id));
      setTotal(t => t - 1);
      toast({ title: 'Video removed.' });
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    } finally { setDeletingId(null); }
  };

  const handleDownload = async (video: VideoItem) => {
    setDownloadingId(video._id);
    try {
      await downloadVideo(video.videoUrl, video.prompt);
      toast({ title: 'Download started!' });
    } catch (err: any) {
      toast({ title: 'Download failed', description: err.message, variant: 'destructive' });
    } finally { setDownloadingId(null); }
  };

  const handleFavorite = async (video: VideoItem) => {
    setFavoritingId(video._id);
    try {
      const result = await toggleFavorite(video._id);
      setVideos(v => v.map(x => x._id === video._id ? { ...x, isFavorited: result.isFavorited } : x));
    } catch (err: any) {
      toast({ title: 'Could not update favourite', variant: 'destructive' });
    } finally { setFavoritingId(null); }
  };

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt).then(() => {
      toast({ title: 'Prompt copied!' });
    }).catch(() => toast({ title: 'Could not copy', variant: 'destructive' }));
  };

  const handleRegenerate = (video: VideoItem) => {
    localStorage.setItem('vc_prefill', JSON.stringify({ prompt: video.prompt, model: video.model, ratio: video.ratio }));
    navigate('/');
    toast({ title: 'Prompt loaded!', description: 'Scroll to the generator to create again.' });
  };

  const hasFilters = search || modelFilter !== 'all' || favoritesOnly;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute top-0 right-0 w-[40%] h-[30%] bg-accent/6 blur-[140px] pointer-events-none rounded-full" />
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-10 max-w-6xl relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-headline font-bold text-white">Video History</h1>
            <p className="text-muted-foreground mt-1">{total} video{total !== 1 ? 's' : ''} generated</p>
          </div>
          <button onClick={() => load(page)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-colors">
            <RefreshCw className="w-4 h-4" />Refresh
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Search prompts..." value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors text-sm" />
          </div>
          <select value={modelFilter} onChange={e => setModelFilter(e.target.value)}
            className="h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50 transition-colors appearance-none pr-8">
            <option value="all" className="bg-gray-900">All Models</option>
            {Object.entries(MODEL_LABELS).map(([k, v]) => (
              <option key={k} value={k} className="bg-gray-900">{v}</option>
            ))}
          </select>
          <button onClick={() => { setFavoritesOnly(!favoritesOnly); load(1, search, modelFilter, !favoritesOnly); }}
            className={`h-11 px-4 rounded-xl border text-sm flex items-center gap-2 transition-colors ${favoritesOnly ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}>
            <Heart className={`w-4 h-4 ${favoritesOnly ? 'fill-red-400' : ''}`} />Favourites
          </button>
          <button onClick={applyFilters}
            className="h-11 px-4 rounded-xl primary-gradient text-background font-bold text-sm flex items-center gap-2">
            <Filter className="w-4 h-4" />Apply
          </button>
          {hasFilters && (
            <button onClick={clearFilters}
              className="h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-muted-foreground hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2">
              <X className="w-4 h-4" />Clear
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : videos.length === 0 ? (
          <div className="glass-morphism rounded-3xl border border-white/10 p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-headline text-white/50 mb-2">
              {hasFilters ? 'No videos match your filters' : 'No videos yet'}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {hasFilters ? 'Try changing your search or filters.' : 'Your generated videos will appear here.'}
            </p>
            {hasFilters ? (
              <button onClick={clearFilters} className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-bold rounded-xl text-sm hover:bg-white/15 transition-all">
                Clear Filters
              </button>
            ) : (
              <a href="/" className="inline-flex items-center gap-2 px-6 py-3 primary-gradient text-background font-bold rounded-xl text-sm hover:scale-105 transition-all">
                Generate Your First Video
              </a>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {videos.map(video => (
                <div key={video._id} className="glass-morphism rounded-2xl border border-white/10 overflow-hidden group">
                  <div className="relative aspect-video bg-black/50 flex items-center justify-center overflow-hidden">
                    {playingId === video._id ? (
                      <video src={video.videoUrl} className="w-full h-full object-contain" controls autoPlay
                        onEnded={() => setPlayingId(null)} />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <button onClick={() => setPlayingId(video._id)}
                          className="relative z-10 w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all hover:scale-110">
                          <Play className="w-6 h-6 text-white ml-1" />
                        </button>
                        <div className="absolute top-2 right-2 flex items-center gap-1.5">
                          <button onClick={() => handleFavorite(video)} disabled={favoritingId === video._id}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${video.isFavorited ? 'bg-red-500/20 text-red-400' : 'bg-black/40 text-white/50 hover:text-red-400'}`}>
                            {favoritingId === video._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Heart className={`w-3.5 h-3.5 ${video.isFavorited ? 'fill-red-400' : ''}`} />}
                          </button>
                        </div>
                        <div className="absolute top-2 left-2 flex gap-1">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${MODEL_COLORS[video.model] || 'text-muted-foreground bg-white/10 border-white/10'}`}>
                            {MODEL_LABELS[video.model] || video.model}
                          </span>
                          <span className="text-[10px] font-medium px-2 py-1 rounded-lg bg-black/40 backdrop-blur-sm text-white/70 border border-white/10">
                            {video.ratio}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-white/70 line-clamp-2 italic">"{video.prompt}"</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(video.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleCopyPrompt(video.prompt)} title="Copy prompt"
                          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-white">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleRegenerate(video)} title="Regenerate"
                          className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary">
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDownload(video)} disabled={downloadingId === video._id}
                          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 text-muted-foreground hover:text-white"
                          title="Download">
                          {downloadingId === video._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => handleDelete(video._id)} disabled={deletingId === video._id}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Delete">
                          {deletingId === video._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <button onClick={() => load(page - 1)} disabled={page <= 1}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-4 h-4" />Prev
                </button>
                <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                <button onClick={() => load(page + 1)} disabled={page >= totalPages}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  Next<ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
