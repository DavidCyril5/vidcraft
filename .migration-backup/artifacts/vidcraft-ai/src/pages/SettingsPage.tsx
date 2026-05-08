import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { User, Lock, Loader2, CheckCircle2, Shield } from 'lucide-react';
import { updateProfile, changePassword } from '@/lib/api-client';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  if (!user) { navigate('/login'); return null; }

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingProfile(true);
    try {
      await updateProfile(name.trim());
      await refreshUser();
      toast({ title: 'Profile updated!', description: 'Your name has been saved.' });
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: 'Password too short', description: 'New password must be at least 6 characters.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast({ title: 'Password changed!', description: 'Your new password is active.' });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) {
      toast({ title: 'Password change failed', description: err.message, variant: 'destructive' });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute bottom-0 left-0 w-[40%] h-[30%] bg-primary/8 blur-[140px] pointer-events-none rounded-full" />
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-10 max-w-2xl relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-headline font-bold text-white">Account Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your profile and security.</p>
        </div>

        <div className="space-y-6">
          <div className="glass-morphism rounded-2xl border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl primary-gradient flex items-center justify-center">
                <User className="w-4 h-4 text-background" />
              </div>
              <div>
                <h3 className="font-bold text-white">Profile</h3>
                <p className="text-xs text-muted-foreground">Update your display name</p>
              </div>
            </div>
            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Full Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required
                  className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Email</label>
                <input type="email" value={user.email} disabled
                  className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/5 text-white/40 cursor-not-allowed" />
                <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Plan</label>
                <div className="flex items-center gap-3 px-4 h-12 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-white capitalize">{user.plan}</span>
                  <a href="/pricing" className="ml-auto text-xs text-primary hover:text-primary/80">Upgrade →</a>
                </div>
              </div>
              <button type="submit" disabled={savingProfile}
                className="flex items-center gap-2 px-6 h-11 primary-gradient text-background font-bold rounded-xl hover:scale-[1.02] transition-all disabled:opacity-60 disabled:scale-100 text-sm">
                {savingProfile ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><CheckCircle2 className="w-4 h-4" />Save Changes</>}
              </button>
            </form>
          </div>

          <div className="glass-morphism rounded-2xl border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center">
                <Lock className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h3 className="font-bold text-white">Change Password</h3>
                <p className="text-xs text-muted-foreground">Keep your account secure</p>
              </div>
            </div>
            <form onSubmit={handlePasswordSave} className="space-y-4">
              {[
                { label: 'Current Password', value: currentPassword, setter: setCurrentPassword, placeholder: 'Enter current password' },
                { label: 'New Password', value: newPassword, setter: setNewPassword, placeholder: 'At least 6 characters' },
                { label: 'Confirm New Password', value: confirmPassword, setter: setConfirmPassword, placeholder: 'Repeat new password' },
              ].map(field => (
                <div key={field.label} className="space-y-2">
                  <label className="text-sm font-medium text-white/80">{field.label}</label>
                  <input type="password" value={field.value} onChange={e => field.setter(e.target.value)}
                    placeholder={field.placeholder} required
                    className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors" />
                </div>
              ))}
              <button type="submit" disabled={savingPassword}
                className="flex items-center gap-2 px-6 h-11 bg-white/10 border border-white/10 text-white font-bold rounded-xl hover:bg-white/15 transition-all disabled:opacity-60 text-sm">
                {savingPassword ? <><Loader2 className="w-4 h-4 animate-spin" />Changing...</> : <><Shield className="w-4 h-4" />Change Password</>}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
