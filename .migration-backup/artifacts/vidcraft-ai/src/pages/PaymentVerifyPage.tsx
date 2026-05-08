import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { CheckCircle2, XCircle, Loader2, Video as LucideVideo } from 'lucide-react';
import { verifyPayment } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';

export default function PaymentVerifyPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [, navigate] = useLocation();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');
    if (!reference) {
      setStatus('error');
      setMessage('No payment reference found.');
      return;
    }
    verifyPayment(reference)
      .then(async (data) => {
        await refreshUser();
        setMessage(data.message || 'Your plan has been upgraded!');
        setStatus('success');
        setTimeout(() => navigate('/'), 3000);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'Payment could not be verified. Please contact support.');
      });
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-primary/10 blur-[150px] pointer-events-none rounded-full" />
      <div className="w-full max-w-md text-center relative z-10">
        <div className="glass-morphism rounded-3xl p-10 border border-white/10">
          <a href="/" className="inline-flex items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 primary-gradient rounded-xl flex items-center justify-center">
              <LucideVideo className="w-4 h-4 text-background" />
            </div>
            <span className="text-xl font-headline font-bold text-gradient">VidCraft AI</span>
          </a>

          {status === 'loading' && (
            <>
              <div className="w-16 h-16 rounded-2xl primary-gradient mx-auto mb-6 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-background animate-spin" />
              </div>
              <h2 className="text-2xl font-headline font-bold text-white mb-2">Verifying Payment</h2>
              <p className="text-muted-foreground text-sm">Please wait while we confirm your payment...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 mx-auto mb-6 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-headline font-bold text-white mb-2">Payment Successful!</h2>
              <p className="text-muted-foreground text-sm mb-6">{message}</p>
              <p className="text-xs text-muted-foreground">Redirecting you to the studio...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 mx-auto mb-6 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-2xl font-headline font-bold text-white mb-2">Verification Failed</h2>
              <p className="text-muted-foreground text-sm mb-6">{message}</p>
              <a href="/" className="inline-flex items-center gap-2 px-6 py-3 primary-gradient text-background font-bold rounded-xl text-sm hover:scale-105 transition-all">
                Return to Studio
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
