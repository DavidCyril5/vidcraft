import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Video as LucideVideo, Loader2, Eye, EyeOff, Sparkles, Gift } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const { register } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) setReferralCode(ref.toUpperCase());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(name, email, password, referralCode || undefined);
      const bonus = referralCode ? 6 : 3;
      toast({ title: 'Welcome to VidCraft AI!', description: `You have ${bonus} free credits to get started.` });
      navigate('/');
    } catch (err: any) {
      toast({ title: 'Sign up failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/15 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-accent/15 blur-[120px] pointer-events-none rounded-full" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 primary-gradient rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <LucideVideo className="w-5 h-5 text-background" />
            </div>
            <span className="text-2xl font-headline font-bold text-gradient">VidCraft AI</span>
          </a>
          <h1 className="text-3xl font-headline font-bold text-white">Create your account</h1>
          <p className="text-muted-foreground mt-2">
            {referralCode ? 'You were referred! Get 6 credits on signup.' : 'Get 3 free credits on signup — no card required'}
          </p>
        </div>

        <div className="glass-morphism rounded-3xl p-8 border border-white/10">
          {referralCode ? (
            <div className="flex items-center gap-2 mb-6 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20">
              <Gift className="w-4 h-4 text-green-400 shrink-0" />
              <span className="text-xs text-green-400 font-medium">Referral bonus! You'll get 6 credits instead of 3.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-6 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs text-primary font-medium">Free users get Wan 2.2 access + 1 daily credit claim</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Full Name</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full h-12 px-4 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">
                Referral Code <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input type="text" value={referralCode} onChange={e => setReferralCode(e.target.value.toUpperCase())}
                placeholder="e.g. AB3XY91K"
                maxLength={10}
                className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors font-mono tracking-widest" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full h-12 primary-gradient text-background font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-60 disabled:scale-100 flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating account...</> : 'Create Free Account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <a href="/login" className="text-primary hover:text-primary/80 font-semibold transition-colors">Sign in</a>
          </div>
        </div>
      </div>
    </div>
  );
}
