import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Coins, Video, Zap, Crown, TrendingUp, Gift, ArrowRight, Sparkles, Clock, Users, Copy, Check, Heart, Loader2, Share2 } from 'lucide-react';
import { getVideoStats, getReferralInfo } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

const PLAN_INFO: Record<string, { label: string; color: string; max: number | null }> = {
  free:    { label: 'Free',    color: 'text-muted-foreground', max: 3 },
  starter: { label: 'Starter', color: 'text-accent',           max: 20 },
  pro:     { label: 'Pro',     color: 'text-primary',          max: 60 },
  vip:     { label: 'VIP',     color: 'text-yellow-400',       max: null },
};

const MODEL_LABELS: Record<string, string> = {
  'wan-2.2': 'Wan 2.2', 'veo-3.1': 'Veo 3.1', 'grok-video': 'Grok Video', 'seedance-2.0': 'Seedance 2.0',
};

export default function DashboardPage() {
  const { user, claimDailyWan } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [stats, setStats] = useState<{ totalVideos: number; byModel: { _id: string; count: number }[]; favorites: number } | null>(null);
  const [referral, setReferral] = useState<{ referralCode: string; referralCount: number; creditsEarned: number } | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    Promise.all([
      getVideoStats().then(setStats).catch(() => {}),
      getReferralInfo().then(setReferral).catch(() => {}),
    ]);
  }, [user]);

  if (!user) return null;

  const plan = PLAN_INFO[user.plan];
  const today = new Date().toISOString().slice(0, 10);
  const canClaim = user.plan === 'free' && user.dailyWanClaimed !== today && !claimed;
  const creditPct = plan.max ? Math.min(100, (user.credits / plan.max) * 100) : 100;

  const handleClaim = async () => {
    setClaiming(true);
    try { await claimDailyWan(); setClaimed(true); toast({ title: '1 credit claimed!' }); }
    catch (err: any) { toast({ title: 'Already claimed', description: err.message, variant: 'destructive' }); }
    finally { setClaiming(false); }
  };

  const referralLink = referral ? `${window.location.origin}/signup?ref=${referral.referralCode}` : '';

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopiedRef(true);
      toast({ title: 'Referral link copied!', description: 'Share it to earn 5 credits per sign-up.' });
      setTimeout(() => setCopiedRef(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[30%] bg-primary/10 blur-[120px] pointer-events-none rounded-full" />
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-10 max-w-5xl relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-headline font-bold text-white">
            Welcome back, <span className="text-gradient">{user.name.split(' ')[0]}</span>
          </h1>
          <p className="text-muted-foreground mt-1">Here's your VidCraft AI overview.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: 'Credits', value: user.credits === 9999 ? '∞' : user.credits, icon: Coins, color: 'text-primary',
              sub: plan.max ? <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-2"><div className="h-full primary-gradient rounded-full transition-all" style={{ width: `${creditPct}%` }} /></div> : null,
            },
            {
              label: 'Plan', value: plan.label, icon: Crown, color: plan.color,
              sub: <a href="/pricing" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 mt-1">{user.plan !== 'vip' ? 'Upgrade' : 'Manage'} <ArrowRight className="w-3 h-3" /></a>,
            },
            {
              label: 'Videos Made', value: stats?.totalVideos ?? '—', icon: Video, color: 'text-accent',
              sub: <a href="/history" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 mt-1">View history <ArrowRight className="w-3 h-3" /></a>,
            },
            {
              label: 'Favourites', value: stats?.favorites ?? '—', icon: Heart, color: 'text-red-400',
              sub: <a href="/history?favorites=true" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 mt-1">View saved <ArrowRight className="w-3 h-3" /></a>,
            },
          ].map(card => (
            <div key={card.label} className="glass-morphism rounded-2xl p-5 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{card.label}</span>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
              {card.sub}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="glass-morphism rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm uppercase tracking-wider">Models Used</h3>
            </div>
            {stats?.byModel && stats.byModel.length > 0 ? (
              <div className="space-y-3">
                {stats.byModel.map(m => {
                  const pct = stats.totalVideos > 0 ? Math.round((m.count / stats.totalVideos) * 100) : 0;
                  return (
                    <div key={m._id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-white">{MODEL_LABELS[m._id] || m._id}</span>
                        <span className="text-muted-foreground">{m.count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full primary-gradient rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-6">Generate videos to see model stats.</div>
            )}
          </div>

          <div className="glass-morphism rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-2 mb-5">
              <Zap className="w-4 h-4 text-accent" />
              <h3 className="font-bold text-sm uppercase tracking-wider">Quick Actions</h3>
            </div>
            <div className="space-y-1.5">
              {[
                { label: 'Generate a Video', href: '/', icon: Sparkles, desc: 'Create with any AI model' },
                { label: 'Video History', href: '/history', icon: Video, desc: 'Browse your past creations' },
                { label: 'Upgrade Plan', href: '/pricing', icon: Crown, desc: 'Unlock more credits & models' },
                { label: 'Account Settings', href: '/settings', icon: Coins, desc: 'Update name & password' },
              ].map(action => (
                <a key={action.href} href={action.href}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/10 transition-colors group">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <action.icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="text-sm font-semibold text-white">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.desc}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-primary transition-colors" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-morphism rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-2 mb-1">
              <Gift className="w-4 h-4 text-green-400" />
              <h3 className="font-bold text-sm uppercase tracking-wider">Daily Credit</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {user.plan === 'free' ? 'Claim 1 free Wan 2.2 credit every day.' : 'Your plan includes unlimited credits.'}
            </p>
            {user.plan === 'free' ? (
              canClaim ? (
                <button onClick={handleClaim} disabled={claiming}
                  className="w-full h-11 primary-gradient text-background font-bold text-sm rounded-xl hover:scale-105 transition-all flex items-center justify-center gap-2">
                  {claiming ? <Sparkles className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                  Claim Free Credit
                </button>
              ) : (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />{claimed ? '✓ Claimed today!' : 'Already claimed — comes back tomorrow.'}
                </div>
              )
            ) : (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20 text-sm text-primary">
                <Sparkles className="w-4 h-4" />Included in your {plan.label} plan.
              </div>
            )}
          </div>

          <div className="glass-morphism rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-accent" />
                <h3 className="font-bold text-sm uppercase tracking-wider">Referral Program</h3>
              </div>
              {referral && (
                <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  +{referral.creditsEarned} earned
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Earn <span className="text-white font-semibold">5 credits</span> for every friend who signs up. Your friend gets <span className="text-white font-semibold">3 bonus credits</span> too.
            </p>
            {referral ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white/50 truncate select-all cursor-text">
                    {referralLink}
                  </div>
                  <button onClick={copyReferralLink}
                    className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all active:scale-95">
                    {copiedRef ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`🎬 Try VidCraft AI — generate stunning videos with AI in seconds!\n\nUse my link to get a bonus credit: ${referralLink}`)}`, '_blank')}
                    className="flex items-center justify-center gap-2 py-2 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-xs font-semibold hover:bg-[#25D366]/20 transition-all active:scale-95">
                    <Share2 className="w-3.5 h-3.5" /> WhatsApp
                  </button>
                  <button
                    onClick={() => window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(`🎬 Generate AI videos in seconds with VidCraft AI!\n\nSign up with my link and get a bonus credit:`)}&url=${encodeURIComponent(referralLink)}`, '_blank')}
                    className="flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold hover:bg-white/10 transition-all active:scale-95">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.629L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    Post on X
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center pt-1">
                  <div className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-2xl font-bold text-white">{referral.referralCount}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Friends referred</p>
                  </div>
                  <div className="px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/20">
                    <p className="text-2xl font-bold text-primary">{referral.creditsEarned}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Credits earned</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
