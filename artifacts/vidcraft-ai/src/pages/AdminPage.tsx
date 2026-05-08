import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Users, Video, Crown, Coins, Search, Trash2, Plus, RefreshCw, Shield, TrendingUp, ChevronLeft, ChevronRight, X, Check, Ban, AlertTriangle, ArrowLeftRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function adminFetch(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem('vc_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as any) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${BASE}${path}`, { ...opts, headers, credentials: 'include' });
}

interface AdminStats {
  totalUsers: number;
  totalVideos: number;
  planBreakdown: { _id: string; count: number }[];
}

interface User {
  _id: string;
  name: string;
  email: string;
  plan: string;
  credits: number;
  isAdmin: boolean;
  createdAt: string;
  referralCount: number;
}

interface Video {
  _id: string;
  userId: string;
  prompt: string;
  model: string;
  ratio: string;
  videoUrl: string;
  createdAt: string;
}

const PLAN_COLORS: Record<string, string> = {
  free: 'text-muted-foreground',
  starter: 'text-accent',
  pro: 'text-primary',
  vip: 'text-yellow-400',
};

const MODEL_LABELS: Record<string, string> = {
  'wan-2.2': 'Wan 2.2', 'veo-3.1': 'Veo 3.1', 'grok-video': 'Grok Video', 'seedance-2.0': 'Seedance 2.0',
};

function EditUserModal({ user, onClose, onSave }: { user: User; onClose: () => void; onSave: () => void }) {
  const [plan, setPlan] = useState(user.plan);
  const [credits, setCredits] = useState(String(user.credits));
  const [isAdmin, setIsAdmin] = useState(user.isAdmin);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const save = async () => {
    setSaving(true);
    try {
      const res = await adminFetch(`/api/admin/users/${user._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ plan, credits: Number(credits), isAdmin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'User updated successfully' });
      onSave();
      onClose();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-morphism rounded-2xl border border-white/10 w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-headline font-bold text-lg">Edit User</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-white mb-0.5">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Plan</label>
            <select value={plan} onChange={e => setPlan(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50">
              {['free', 'starter', 'pro', 'vip'].map(p => <option key={p} value={p} className="bg-[#1a0f22]">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Credits</label>
            <input type="number" value={credits} onChange={e => setCredits(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => setIsAdmin(!isAdmin)}
              className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${isAdmin ? 'bg-primary' : 'bg-white/10'}`}>
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isAdmin ? 'translate-x-4' : ''}`} />
            </div>
            <span className="text-sm">Admin privileges</span>
          </label>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm hover:bg-white/5 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-2.5 rounded-xl primary-gradient text-background font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TransferCreditsModal({ toUser, allUsers, onClose, onDone }: {
  toUser: User;
  allUsers: User[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [fromUserId, setFromUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  const candidates = allUsers.filter(u =>
    u._id !== toUser._id &&
    (u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
  );

  const fromUser = allUsers.find(u => u._id === fromUserId);

  const doTransfer = async () => {
    if (!fromUserId || !amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    setTransferring(true);
    try {
      const res = await adminFetch('/api/admin/transfer-credits', {
        method: 'POST',
        body: JSON.stringify({ fromUserId, toUserId: toUser._id, amount: Number(amount) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'Transfer complete', description: data.message });
      onDone();
      onClose();
    } catch (err: any) {
      toast({ title: 'Transfer failed', description: err.message, variant: 'destructive' });
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-morphism rounded-2xl border border-white/10 w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-primary" />
            <h3 className="font-headline font-bold text-lg">Transfer Credits</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Destination (receiving)</p>
          <p className="font-semibold text-white">{toUser.name}</p>
          <p className="text-xs text-muted-foreground">{toUser.email} · {toUser.credits === 1000000 ? '∞' : toUser.credits} credits</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Transfer FROM</label>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..."
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50 mb-2 placeholder:text-muted-foreground" />
            <div className="max-h-36 overflow-y-auto rounded-xl border border-white/10 divide-y divide-white/5">
              {candidates.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">No users found</p>
              )}
              {candidates.map(u => (
                <button key={u._id} onClick={() => setFromUserId(u._id)}
                  className={`w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-white/5 transition-colors ${fromUserId === u._id ? 'bg-primary/10' : ''}`}>
                  <div>
                    <p className="text-sm font-semibold text-white leading-tight">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-primary font-bold">{u.credits === 1000000 ? '∞' : u.credits} cr</span>
                    {fromUserId === u._id && <Check className="w-3.5 h-3.5 text-primary" />}
                  </div>
                </button>
              ))}
            </div>
            {fromUser && (
              <p className="text-xs text-muted-foreground mt-1.5">
                Selected: <span className="text-white font-semibold">{fromUser.name}</span> · {fromUser.credits === 1000000 ? '∞' : fromUser.credits} credits available
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Amount to Transfer</label>
            <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 500"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50" />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm hover:bg-white/5 transition-colors">Cancel</button>
          <button onClick={doTransfer} disabled={transferring || !fromUserId || !amount}
            className="flex-1 py-2.5 rounded-xl primary-gradient text-background font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
            {transferring ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowLeftRight className="w-3.5 h-3.5" />}
            {transferring ? 'Transferring...' : 'Transfer'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [tab, setTab] = useState<'overview' | 'users' | 'videos' | 'security'>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [videoTotal, setVideoTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [videoPage, setVideoPage] = useState(1);
  const [userPages, setUserPages] = useState(1);
  const [videoPages, setVideoPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [grantUserId, setGrantUserId] = useState<string | null>(null);
  const [grantAmount, setGrantAmount] = useState('');
  const [ipData, setIpData] = useState<{ flagged: any[]; all: any[]; limit: number } | null>(null);
  const [ipLoading, setIpLoading] = useState(false);
  const [transferToUser, setTransferToUser] = useState<User | null>(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!user.isAdmin) { navigate('/'); return; }
    loadStats();
  }, [user]);

  useEffect(() => {
    if (tab === 'users') loadUsers();
    if (tab === 'videos') loadVideos();
    if (tab === 'security') loadIpData();
  }, [tab, userPage, videoPage]);

  const loadStats = async () => {
    const res = await adminFetch('/api/admin/stats');
    if (res.ok) setStats(await res.json());
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(userPage), limit: '15' });
      if (search) params.set('search', search);
      const res = await adminFetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setUserTotal(data.total);
        setUserPages(data.pages);
      }
    } finally { setLoading(false); }
  }, [userPage, search]);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch(`/api/admin/videos?page=${videoPage}&limit=15`);
      if (res.ok) {
        const data = await res.json();
        setVideos(data.videos);
        setVideoTotal(data.total);
        setVideoPages(data.pages);
      }
    } finally { setLoading(false); }
  }, [videoPage]);

  const deleteUser = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? This also removes their video history.`)) return;
    const res = await adminFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { toast({ title: 'Error', description: data.error, variant: 'destructive' }); return; }
    toast({ title: 'User deleted' });
    loadUsers();
    loadStats();
  };

  const grantCredits = async (userId: string) => {
    if (!grantAmount || isNaN(Number(grantAmount))) return;
    const res = await adminFetch(`/api/admin/users/${userId}/grant-credits`, {
      method: 'POST', body: JSON.stringify({ credits: Number(grantAmount) }),
    });
    const data = await res.json();
    if (!res.ok) { toast({ title: 'Error', description: data.error, variant: 'destructive' }); return; }
    toast({ title: `Granted ${grantAmount} credits!`, description: `New total: ${data.credits}` });
    setGrantUserId(null);
    setGrantAmount('');
    loadUsers();
  };

  const handleUserSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setUserPage(1);
    loadUsers();
  };

  const loadIpData = useCallback(async () => {
    setIpLoading(true);
    try {
      const res = await adminFetch('/api/admin/ip-abuse');
      if (res.ok) setIpData(await res.json());
    } finally { setIpLoading(false); }
  }, []);

  const clearIp = async (ip: string) => {
    const res = await adminFetch(`/api/admin/ip-abuse/${encodeURIComponent(ip)}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { toast({ title: 'Error', description: data.error, variant: 'destructive' }); return; }
    toast({ title: 'IP cleared', description: `${ip} can register again.` });
    loadIpData();
  };

  if (!user?.isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[30%] bg-primary/10 blur-[120px] pointer-events-none rounded-full" />

      {editUser && (
        <EditUserModal user={editUser} onClose={() => setEditUser(null)} onSave={() => { loadUsers(); loadStats(); }} />
      )}
      {transferToUser && (
        <TransferCreditsModal
          toUser={transferToUser}
          allUsers={users}
          onClose={() => setTransferToUser(null)}
          onDone={() => { loadUsers(); loadStats(); }}
        />
      )}

      <div className="relative z-10">
        <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl primary-gradient flex items-center justify-center">
              <Shield className="w-4 h-4 text-background" />
            </div>
            <div>
              <h1 className="font-headline font-bold text-white">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">VidCraft AI Control Center</p>
            </div>
          </div>
          <a href="/" className="text-xs text-muted-foreground hover:text-white transition-colors flex items-center gap-1">
            <ChevronLeft className="w-3 h-3" /> Back to App
          </a>
        </header>

        <div className="px-6 py-6 max-w-7xl mx-auto">
          <div className="flex gap-1 mb-6 p-1 bg-white/5 rounded-xl w-fit flex-wrap">
            {(['overview', 'users', 'videos', 'security'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all flex items-center gap-1.5 ${tab === t ? 'bg-primary text-background' : 'text-muted-foreground hover:text-white'}`}>
                {t === 'security' && <Shield className="w-3.5 h-3.5" />}
                {t}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Users', value: stats?.totalUsers ?? '—', icon: Users, color: 'text-primary' },
                  { label: 'Total Videos', value: stats?.totalVideos ?? '—', icon: Video, color: 'text-accent' },
                  { label: 'VIP Users', value: stats?.planBreakdown.find(p => p._id === 'vip')?.count ?? 0, icon: Crown, color: 'text-yellow-400' },
                  { label: 'Pro Users', value: stats?.planBreakdown.find(p => p._id === 'pro')?.count ?? 0, icon: TrendingUp, color: 'text-purple-400' },
                ].map(card => (
                  <div key={card.label} className="glass-morphism rounded-2xl p-5 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{card.label}</span>
                      <card.icon className={`w-4 h-4 ${card.color}`} />
                    </div>
                    <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                  </div>
                ))}
              </div>

              <div className="glass-morphism rounded-2xl p-6 border border-white/10">
                <h3 className="font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-primary" /> Plan Distribution
                </h3>
                <div className="space-y-3">
                  {stats?.planBreakdown.map(p => {
                    const pct = stats.totalUsers > 0 ? Math.round((p.count / stats.totalUsers) * 100) : 0;
                    return (
                      <div key={p._id}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className={`font-semibold capitalize ${PLAN_COLORS[p._id] || 'text-white'}`}>{p._id}</span>
                          <span className="text-muted-foreground">{p.count} users ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full primary-gradient rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setTab('users')} className="glass-morphism rounded-2xl p-5 border border-white/10 text-left hover:border-primary/30 transition-colors group">
                  <Users className="w-6 h-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
                  <p className="font-bold">Manage Users</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Edit plans, credits & admin status</p>
                </button>
                <button onClick={() => setTab('videos')} className="glass-morphism rounded-2xl p-5 border border-white/10 text-left hover:border-primary/30 transition-colors group">
                  <Video className="w-6 h-6 text-accent mb-2 group-hover:scale-110 transition-transform" />
                  <p className="font-bold">All Videos</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Browse every generated video</p>
                </button>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <form onSubmit={handleUserSearch} className="flex-1 flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-primary/50 text-white placeholder:text-muted-foreground" />
                  </div>
                  <button type="submit" className="px-4 py-2.5 rounded-xl primary-gradient text-background font-bold text-sm">Search</button>
                </form>
                <button onClick={() => { setSearch(''); setUserPage(1); loadUsers(); }} className="p-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition-colors">
                  <RefreshCw className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="glass-morphism rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{userTotal} Total Users</span>
                  <span className="text-xs text-muted-foreground">Page {userPage}/{userPages}</span>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {users.map(u => (
                      <div key={u._id} className="px-5 py-4 hover:bg-white/5 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl primary-gradient flex items-center justify-center shrink-0 text-background font-bold text-sm">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-white">{u.name}</span>
                              {u.isAdmin && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary">ADMIN</span>}
                              <span className={`text-xs font-semibold capitalize ${PLAN_COLORS[u.plan] || 'text-white'}`}>{u.plan}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Coins className="w-3 h-3 text-primary" />{u.credits === 1000000 ? '∞ credits' : `${u.credits} credits`}</span>
                              <span>{u.referralCount} referrals</span>
                              <span>{new Date(u.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {grantUserId === u._id ? (
                              <div className="flex items-center gap-1.5">
                                <input type="number" value={grantAmount} onChange={e => setGrantAmount(e.target.value)}
                                  placeholder="Credits" autoFocus
                                  className="w-20 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-primary/50" />
                                <button onClick={() => grantCredits(u._id)} className="p-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => { setGrantUserId(null); setGrantAmount(''); }} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setGrantUserId(u._id)} title="Grant credits"
                                className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors text-muted-foreground hover:text-white">
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => setTransferToUser(u)} title="Transfer credits to this user"
                              className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors text-muted-foreground hover:text-primary">
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditUser(u)}
                              className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors text-xs text-muted-foreground hover:text-white">
                              Edit
                            </button>
                            <button onClick={() => deleteUser(u._id, u.name)}
                              className="p-1.5 rounded-lg border border-destructive/20 hover:bg-destructive/10 transition-colors text-destructive/60 hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {users.length === 0 && (
                      <div className="text-center py-12 text-sm text-muted-foreground">No users found.</div>
                    )}
                  </div>
                )}
                {userPages > 1 && (
                  <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between">
                    <button disabled={userPage <= 1} onClick={() => setUserPage(p => p - 1)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <ChevronLeft className="w-3.5 h-3.5" /> Previous
                    </button>
                    <span className="text-xs text-muted-foreground">{userPage} of {userPages}</span>
                    <button disabled={userPage >= userPages} onClick={() => setUserPage(p => p + 1)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'videos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{videoTotal} total videos generated</span>
                <button onClick={loadVideos} className="p-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors">
                  <RefreshCw className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="glass-morphism rounded-2xl border border-white/10 overflow-hidden">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {videos.map(v => (
                      <div key={v._id} className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                            <Video className="w-4 h-4 text-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium leading-snug line-clamp-2">{v.prompt}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                              <span className="text-primary font-medium">{MODEL_LABELS[v.model] || v.model}</span>
                              <span>{v.ratio}</span>
                              <span>{new Date(v.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                          <a href={v.videoUrl} target="_blank" rel="noopener noreferrer"
                            className="shrink-0 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors text-xs text-muted-foreground hover:text-white">
                            View
                          </a>
                        </div>
                      </div>
                    ))}
                    {videos.length === 0 && (
                      <div className="text-center py-12 text-sm text-muted-foreground">No videos found.</div>
                    )}
                  </div>
                )}
                {videoPages > 1 && (
                  <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between">
                    <button disabled={videoPage <= 1} onClick={() => setVideoPage(p => p - 1)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <ChevronLeft className="w-3.5 h-3.5" /> Previous
                    </button>
                    <span className="text-xs text-muted-foreground">{videoPage} of {videoPages}</span>
                    <button disabled={videoPage >= videoPages} onClick={() => setVideoPage(p => p + 1)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'security' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Flagged IPs', value: ipData?.flagged.length ?? '—', icon: Ban, color: 'text-red-400' },
                  { label: 'Total Tracked IPs', value: ipData?.all.length ?? '—', icon: AlertTriangle, color: 'text-yellow-400' },
                  { label: 'Limit per IP / day', value: ipData?.limit ?? '—', icon: Shield, color: 'text-primary' },
                ].map(c => (
                  <div key={c.label} className="glass-morphism rounded-2xl border border-white/10 p-5 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0`}>
                      <c.icon className={`w-5 h-5 ${c.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{c.label}</p>
                      <p className="text-2xl font-headline font-bold text-white">{c.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="glass-morphism rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                  <div>
                    <h3 className="font-headline font-bold text-white flex items-center gap-2">
                      <Ban className="w-4 h-4 text-red-400" /> Blocked IPs
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">IPs that have hit the daily registration cap</p>
                  </div>
                  <button onClick={loadIpData} disabled={ipLoading}
                    className="p-2 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50">
                    <RefreshCw className={`w-4 h-4 ${ipLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                {ipLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {(ipData?.flagged ?? []).length === 0 && (
                      <div className="text-center py-12 text-sm text-muted-foreground">No blocked IPs — all clear.</div>
                    )}
                    {(ipData?.flagged ?? []).map((entry: any) => (
                      <div key={entry.ip} className="px-5 py-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                            <Ban className="w-4 h-4 text-red-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-mono text-white truncate">{entry.ip}</p>
                            <p className="text-xs text-muted-foreground">
                              {entry.count} attempt{entry.count !== 1 ? 's' : ''} · expires {new Date(entry.expiresAt ?? entry.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <button onClick={() => clearIp(entry.ip)}
                          className="shrink-0 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-xs font-semibold flex items-center gap-1">
                          <X className="w-3.5 h-3.5" /> Clear
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="glass-morphism rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10">
                  <h3 className="font-headline font-bold text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" /> All Tracked IPs
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Every IP that has attempted registration in the last 24h</p>
                </div>
                <div className="divide-y divide-white/5">
                  {(ipData?.all ?? []).length === 0 && (
                    <div className="text-center py-12 text-sm text-muted-foreground">No registration attempts recorded.</div>
                  )}
                  {(ipData?.all ?? []).map((entry: any) => {
                    const isBlocked = entry.count >= (ipData?.limit ?? 3);
                    return (
                      <div key={entry.ip} className="px-5 py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${isBlocked ? 'bg-red-400' : 'bg-green-400'}`} />
                          <p className="text-sm font-mono text-white truncate">{entry.ip}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-xs font-bold ${isBlocked ? 'text-red-400' : 'text-muted-foreground'}`}>
                            {entry.count}/{ipData?.limit ?? 3} uses
                          </span>
                          {isBlocked && (
                            <button onClick={() => clearIp(entry.ip)}
                              className="px-2 py-1 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-xs">
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
