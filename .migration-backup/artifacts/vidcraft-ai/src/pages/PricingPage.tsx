import React, { useState } from 'react';
import { Check, Sparkles, Zap, Crown, Loader2, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { initializePayment } from '@/lib/api-client';
import { useLocation } from 'wouter';

const plans = [
  {
    id: 'free', name: 'Free', price: 0, icon: Sparkles, color: 'text-muted-foreground',
    gradient: 'from-white/5 to-white/10',
    features: ['3 starter credits', 'Wan 2.2 model only', '1 free credit per day', 'Standard queue', 'Video history'],
    cta: 'Current Plan', disabled: true,
  },
  {
    id: 'starter', name: 'Starter', price: 1000, icon: Zap, color: 'text-accent',
    gradient: 'from-accent/10 to-accent/5',
    features: ['20 credits per month', 'All 4 AI models', 'Priority queue', 'HD video output', 'Email support', 'Video history'],
    cta: 'Get Starter',
  },
  {
    id: 'pro', name: 'Pro', price: 3000, icon: Sparkles, color: 'text-primary',
    gradient: 'from-primary/15 to-primary/5',
    features: ['60 credits per month', 'All 4 AI models', 'Priority queue', 'HD video output', 'Image-to-video', 'Priority support', 'Video history'],
    cta: 'Get Pro', popular: true,
  },
  {
    id: 'vip', name: 'VIP', price: 7000, icon: Crown, color: 'text-yellow-400',
    gradient: 'from-yellow-400/10 to-yellow-400/5',
    features: ['Unlimited credits', 'All AI models', 'Fastest queue', 'Ultra HD output', 'Image + End image', 'Dedicated support', 'Early model access'],
    cta: 'Go VIP',
  },
];

const FAQS = [
  { q: 'What happens when I run out of credits?', a: 'Free users can claim 1 additional credit per day using the daily claim button. Paid users can upgrade to a higher plan or wait for the next billing cycle. Your account is never suspended — you just can\'t generate until credits are available.' },
  { q: 'Are credits refunded if generation fails?', a: 'Yes, always. If your video generation fails for any reason — server error, timeout, or model issue — your credit is automatically refunded to your account within seconds.' },
  { q: 'Can I use the generated videos commercially?', a: 'Yes. You retain full rights to videos you generate on VidCraft AI and may use them for personal or commercial purposes, subject to the terms of the underlying AI model providers.' },
  { q: 'How long does video generation take?', a: 'Most videos take between 3–6 minutes to generate. This is normal — our AI models need time to render high-quality output. You\'ll see a live countdown timer while your video is being created.' },
  { q: 'Which payment methods are accepted?', a: 'We use Paystack, which supports Nigerian debit/credit cards, bank transfers, and USSD. All prices are in Nigerian Naira (₦). We do not support foreign cards at this time.' },
  { q: 'Can I cancel my subscription?', a: 'Yes, contact us at support@vidcraft.ai to cancel. You\'ll keep your plan until the end of the billing period, then revert to Free. We don\'t offer refunds for partial months.' },
  { q: 'What is the difference between Wan 2.2 and the other models?', a: 'Wan 2.2 is our free model — great for text-to-video and basic image-to-video. Veo 3.1, Grok Video, and Seedance 2.0 are premium models on paid plans, offering higher quality, faster rendering, and more visual fidelity.' },
  { q: 'How does the referral program work?', a: 'Share your referral link from the Dashboard. When a friend signs up using your link, they get 1 bonus credit and you earn 2 credits — instantly added to your account.' },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/5 last:border-0">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4 group">
        <span className="text-sm font-semibold text-white group-hover:text-primary transition-colors">{q}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="text-sm text-white/70 leading-relaxed pb-5">{a}</p>}
    </div>
  );
}

export default function PricingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [, navigate] = useLocation();

  const handleUpgrade = async (planId: string) => {
    if (!user) { navigate('/signup'); return; }
    if (planId === 'free') return;
    setLoading(planId);
    try {
      const { authorizationUrl } = await initializePayment(planId);
      window.location.href = authorizationUrl;
    } catch (err: any) {
      toast({ title: 'Payment Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[40%] bg-primary/10 blur-[150px] pointer-events-none rounded-full" />

      <nav className="border-b border-white/5 bg-background/50 backdrop-blur-xl sticky top-0 z-50 px-4">
        <div className="container mx-auto h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 primary-gradient rounded-xl flex items-center justify-center">
              <Zap className="w-4 h-4 text-background" />
            </div>
            <span className="text-xl font-headline font-bold text-gradient">VidCraft AI</span>
          </a>
          {user && <span className="text-sm text-muted-foreground">{user.credits === 9999 ? '∞' : user.credits} credits</span>}
        </div>
      </nav>

      <main className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold tracking-wider text-primary uppercase mb-6">
            <Crown className="w-3.5 h-3.5" />Simple Pricing
          </div>
          <h1 className="text-4xl md:text-6xl font-headline font-bold text-white mb-4">
            Create without <span className="text-gradient">limits</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            All prices in Nigerian Naira (₦). No hidden fees. Cancel anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {plans.map(plan => {
            const Icon = plan.icon;
            const isCurrent = user?.plan === plan.id;
            return (
              <div key={plan.id} className={`relative rounded-3xl p-6 border flex flex-col ${plan.popular ? 'border-primary/40 bg-gradient-to-b from-primary/10 to-primary/5' : 'border-white/10 bg-white/5'}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 primary-gradient rounded-full text-xs font-bold text-background">
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-4 border border-white/10`}>
                    <Icon className={`w-5 h-5 ${plan.color}`} />
                  </div>
                  <h3 className="text-xl font-headline font-bold text-white">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    {plan.price === 0 ? (
                      <span className="text-3xl font-bold text-white">Free</span>
                    ) : (
                      <><span className="text-3xl font-bold text-white">₦{plan.price.toLocaleString()}</span><span className="text-muted-foreground text-sm">/mo</span></>
                    )}
                  </div>
                </div>
                <ul className="space-y-3 flex-grow mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-white/80">
                      <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.color}`} />{f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => handleUpgrade(plan.id)} disabled={isCurrent || plan.disabled || loading === plan.id}
                  className={`w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    isCurrent ? 'bg-white/10 text-white/40 cursor-default' :
                    plan.popular ? 'primary-gradient text-background hover:scale-105 shadow-lg shadow-primary/20' :
                    'bg-white/10 text-white hover:bg-white/15 border border-white/10'
                  }`}>
                  {loading === plan.id ? <><Loader2 className="w-4 h-4 animate-spin" />Processing...</> :
                   isCurrent ? '✓ Current Plan' : plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        <div className="text-center mb-8">
          <p className="text-sm text-muted-foreground">
            Payments secured by Paystack · Nigerian cards, bank transfers, and USSD supported.
          </p>
        </div>

        <div id="faq" className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-white mb-3">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Everything you need to know before getting started.</p>
          </div>
          <div className="glass-morphism rounded-2xl border border-white/10 px-6">
            {FAQS.map(faq => <FAQItem key={faq.q} {...faq} />)}
          </div>
          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              Still have questions?{' '}
              <a href="/contact" className="text-primary hover:text-primary/80 font-semibold transition-colors">Contact support →</a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
