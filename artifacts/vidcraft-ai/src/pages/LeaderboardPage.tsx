import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { getLeaderboard } from '@/lib/api-client';
import { Trophy, Medal, Users, Coins, Crown, Loader2, Star } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  name: string;
  referralCount: number;
  creditsEarned: number;
  plan: string;
}

const PLAN_BADGE: Record<string, { label: string; color: string }> = {
  free:    { label: 'Free',    color: 'text-muted-foreground bg-white/10' },
  starter: { label: 'Starter', color: 'text-accent bg-accent/10' },
  pro:     { label: 'Pro',     color: 'text-primary bg-primary/10' },
  vip:     { label: 'VIP',     color: 'text-yellow-400 bg-yellow-400/10' },
};

const MEDAL_COLORS = ['text-yellow-400', 'text-slate-300', 'text-amber-600'];
const MEDAL_BG = ['bg-yellow-400/10 border-yellow-400/30', 'bg-slate-300/10 border-slate-300/30', 'bg-amber-600/10 border-amber-600/30'];
const MEDAL_GLOW = ['shadow-yellow-400/20', 'shadow-slate-300/10', 'shadow-amber-600/10'];

function truncateName(name: string, max = 18) {
  return name.length > max ? name.slice(0, max) + '…' : name;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard()
      .then(data => setEntries(data.leaderboard))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const userRankEntry = user
    ? entries.find(e => e.name === user.name)
    : null;

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[35%] bg-yellow-400/5 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-[-5%] left-[-5%] w-[35%] h-[30%] bg-primary/8 blur-[120px] pointer-events-none rounded-full" />
      <Navbar />

      <main className="flex-grow container mx-auto px-4 py-10 max-w-3xl relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 mb-4 shadow-lg shadow-yellow-400/10">
            <Trophy className="w-7 h-7 text-yellow-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-headline font-bold text-white">
            Referral <span className="text-gradient">Leaderboard</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Top users ranked by friends referred. Share your link to climb the board.
          </p>
        </div>

        {userRankEntry && (
          <div className="mb-6 px-5 py-4 rounded-2xl bg-primary/10 border border-primary/25 flex items-center gap-4">
            <div className="w-9 h-9 rounded-full primary-gradient flex items-center justify-center shrink-0">
              <Star className="w-4 h-4 text-background" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Your rank: <span className="text-primary">#{userRankEntry.rank}</span></p>
              <p className="text-xs text-muted-foreground">{userRankEntry.referralCount} referrals · {userRankEntry.creditsEarned} credits earned</p>
            </div>
            <a href="/dashboard" className="shrink-0 text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
              Share link →
            </a>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20 glass-morphism rounded-2xl border border-white/10">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">No referrals yet</p>
            <p className="text-sm text-muted-foreground">Be the first to refer a friend and top the chart!</p>
            {user && (
              <a href="/dashboard" className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
                Get your referral link →
              </a>
            )}
          </div>
        ) : (
          <>
            {top3.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[top3[1], top3[0], top3[2]].filter(Boolean).map((entry, visualIdx) => {
                  const actualRank = entry.rank - 1;
                  const centerIdx = top3.length === 1 ? 0 : 1;
                  const isCenter = (top3.length >= 2 && entry.rank === 1) || (top3.length === 1 && visualIdx === 0);
                  return (
                    <div key={entry.rank}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border glass-morphism shadow-lg ${MEDAL_BG[actualRank]} ${MEDAL_GLOW[actualRank]} ${isCenter ? 'scale-105 -mt-2' : ''} transition-transform`}>
                      {actualRank === 0 ? (
                        <Crown className={`w-6 h-6 ${MEDAL_COLORS[actualRank]}`} />
                      ) : (
                        <Medal className={`w-6 h-6 ${MEDAL_COLORS[actualRank]}`} />
                      )}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-bold text-sm ${MEDAL_COLORS[actualRank]} ${MEDAL_BG[actualRank]}`}>
                        #{entry.rank}
                      </div>
                      <p className="text-xs font-bold text-white text-center leading-tight">{truncateName(entry.name, 12)}</p>
                      <div className="text-center">
                        <p className={`text-lg font-bold ${MEDAL_COLORS[actualRank]}`}>{entry.referralCount}</p>
                        <p className="text-[10px] text-muted-foreground">referrals</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Coins className="w-3 h-3 text-primary" />
                        <span className="text-xs font-semibold text-primary">{entry.creditsEarned}</span>
                      </div>
                      {PLAN_BADGE[entry.plan] && (
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${PLAN_BADGE[entry.plan].color}`}>
                          {PLAN_BADGE[entry.plan].label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {rest.length > 0 && (
              <div className="glass-morphism rounded-2xl border border-white/10 overflow-hidden">
                <div className="grid grid-cols-[48px_1fr_80px_80px] px-4 py-2.5 border-b border-white/5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span>Rank</span>
                  <span>User</span>
                  <span className="text-right">Referrals</span>
                  <span className="text-right">Credits</span>
                </div>
                {rest.map((entry, i) => {
                  const isMe = user && entry.name === user.name;
                  return (
                    <div key={entry.rank}
                      className={`grid grid-cols-[48px_1fr_80px_80px] px-4 py-3 items-center border-b border-white/5 last:border-0 transition-colors ${isMe ? 'bg-primary/5' : 'hover:bg-white/3'}`}>
                      <span className="text-sm font-bold text-muted-foreground">#{entry.rank}</span>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-white/60">{entry.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold truncate ${isMe ? 'text-primary' : 'text-white'}`}>
                            {truncateName(entry.name)}{isMe ? ' (you)' : ''}
                          </p>
                          {PLAN_BADGE[entry.plan] && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${PLAN_BADGE[entry.plan].color}`}>
                              {PLAN_BADGE[entry.plan].label}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm font-bold text-white text-right">{entry.referralCount}</p>
                      <div className="flex items-center justify-end gap-1">
                        <Coins className="w-3 h-3 text-primary" />
                        <span className="text-sm font-semibold text-primary">{entry.creditsEarned}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          Earn <span className="text-white font-semibold">5 credits</span> per referral.{' '}
          {user ? (
            <a href="/dashboard" className="text-primary hover:text-primary/80 transition-colors">Share your link from the Dashboard.</a>
          ) : (
            <a href="/signup" className="text-primary hover:text-primary/80 transition-colors">Sign up to get your referral link.</a>
          )}
        </p>
      </main>
    </div>
  );
}
