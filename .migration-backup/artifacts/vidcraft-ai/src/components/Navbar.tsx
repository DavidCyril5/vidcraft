import React, { useState, useEffect, useRef } from 'react';
import { Video as LucideVideo, Menu, User, Sparkles, LogOut, Coins, Crown, X, LayoutDashboard, History, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const PLAN_BADGE: Record<string, { label: string; color: string }> = {
  free:    { label: 'Free',    color: 'text-muted-foreground bg-white/10' },
  starter: { label: 'Starter', color: 'text-accent bg-accent/10' },
  pro:     { label: 'Pro',     color: 'text-primary bg-primary/10' },
  vip:     { label: 'VIP',     color: 'text-yellow-400 bg-yellow-400/10' },
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    setMobileOpen(false);
    toast({ title: 'Signed out', description: 'See you next time!' });
  };

  const badge = user ? PLAN_BADGE[user.plan] : null;

  return (
    <nav className="border-b border-white/5 bg-background/60 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 md:w-9 md:h-9 primary-gradient rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
            <LucideVideo className="w-4 h-4 md:w-5 md:h-5 text-background" />
          </div>
          <span className="text-lg md:text-xl font-headline font-bold text-gradient">VidCraft AI</span>
        </a>

        <div className="hidden md:flex items-center gap-6">
          <a href="/" className="text-sm font-medium hover:text-primary transition-colors">Generator</a>
          <a href="/pricing" className="text-sm font-medium hover:text-primary transition-colors">Pricing</a>
          {user && (
            <>
              <a href="/history" className="text-sm font-medium hover:text-primary transition-colors">History</a>
              <a href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">Dashboard</a>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                  <Coins className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-bold text-white">{user.credits === 9999 ? '∞' : user.credits}</span>
                  <span className="text-xs text-muted-foreground">credits</span>
                </div>
                {badge && (
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${badge.color}`}>
                    {badge.label}
                  </span>
                )}
              </div>
              <div className="relative" ref={dropdownRef}>
                <button onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="w-6 h-6 rounded-full primary-gradient flex items-center justify-center">
                    <User className="w-3 h-3 text-background" />
                  </div>
                  <span className="text-sm font-medium hidden sm:block truncate max-w-[100px]">{user.name.split(' ')[0]}</span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-60 glass-morphism rounded-2xl border border-white/10 shadow-2xl overflow-hidden z-50">
                    <div className="p-4 border-b border-white/5">
                      <p className="font-semibold text-sm text-white truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Coins className="w-3 h-3 text-primary" />
                        <span className="text-xs text-white font-medium">{user.credits === 9999 ? '∞' : user.credits} credits</span>
                        {badge && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ml-auto ${badge.color}`}>{badge.label}</span>}
                      </div>
                    </div>
                    <div className="p-2">
                      {[
                        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                        { href: '/history',   icon: History,         label: 'Video History' },
                        { href: '/settings',  icon: Settings,        label: 'Settings' },
                        { href: '/pricing',   icon: Crown,           label: 'Upgrade Plan' },
                      ].map(item => (
                        <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors text-sm">
                          <item.icon className={`w-4 h-4 ${item.href === '/pricing' ? 'text-yellow-400' : 'text-muted-foreground'}`} />
                          {item.label}
                        </a>
                      ))}
                      <div className="border-t border-white/5 mt-1 pt-1">
                        <button onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors text-sm text-red-400">
                          <LogOut className="w-4 h-4" />Sign Out
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <a href="/login"
                className="hidden sm:flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-medium text-white/80 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                Sign In
              </a>
              <a href="/signup"
                className="flex items-center gap-1.5 h-9 px-4 rounded-xl primary-gradient text-background font-bold text-sm shadow-md shadow-primary/20 hover:scale-105 transition-all">
                <Sparkles className="w-3.5 h-3.5" />
                Get Started
              </a>
            </>
          )}

          <button className="md:hidden p-2 rounded-xl hover:bg-white/10 transition-colors" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 bg-background/80 backdrop-blur-xl px-4 py-4 space-y-1">
          {user && (
            <div className="px-4 py-3 mb-2 rounded-xl bg-white/5 border border-white/10">
              <p className="font-semibold text-sm text-white">{user.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Coins className="w-3 h-3 text-primary" />
                <span className="text-xs text-muted-foreground">{user.credits === 9999 ? '∞' : user.credits} credits</span>
                {badge && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${badge.color}`}>{badge.label}</span>}
              </div>
            </div>
          )}
          {[
            { href: '/', label: 'Generator' },
            { href: '/pricing', label: 'Pricing' },
            ...(user ? [
              { href: '/dashboard', label: 'Dashboard' },
              { href: '/history', label: 'Video History' },
              { href: '/settings', label: 'Settings' },
            ] : [
              { href: '/login', label: 'Sign In' },
            ]),
          ].map(item => (
            <a key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
              className="block px-4 py-3 rounded-xl hover:bg-white/10 text-sm font-medium transition-colors">
              {item.label}
            </a>
          ))}
          {user && (
            <button onClick={handleLogout}
              className="w-full text-left px-4 py-3 rounded-xl hover:bg-red-500/10 text-sm font-medium text-red-400 transition-colors">
              Sign Out
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
