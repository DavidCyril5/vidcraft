import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Mail, MessageSquare, Send, CheckCircle2, Loader2, Clock, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ContactPage() {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setSent(true);
    toast({ title: 'Message sent!', description: 'We\'ll get back to you within 24 hours.' });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-primary/8 blur-[160px] pointer-events-none rounded-full" />
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-12 max-w-5xl relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold tracking-wider text-primary uppercase mb-4">
            <MessageSquare className="w-3.5 h-3.5" />Support
          </div>
          <h1 className="text-4xl md:text-5xl font-headline font-bold text-white mb-3">Get in Touch</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Have a question or issue? We typically respond within a few hours.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-4">
            {[
              { icon: Mail, title: 'Email Support', desc: 'support@vidcraft.ai', sub: 'Response within 24 hours' },
              { icon: Clock, title: 'Support Hours', desc: 'Mon – Fri, 9am – 6pm WAT', sub: 'West Africa Time' },
              { icon: Zap, title: 'Quick Answers', desc: 'Check the FAQ first', sub: 'Most questions answered there', href: '/pricing#faq' },
            ].map(card => (
              <div key={card.title} className="glass-morphism rounded-2xl p-5 border border-white/10">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl primary-gradient flex items-center justify-center shrink-0">
                    <card.icon className="w-4 h-4 text-background" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white">{card.title}</p>
                    {card.href
                      ? <a href={card.href} className="text-xs text-primary hover:text-primary/80 transition-colors">{card.desc}</a>
                      : <p className="text-xs text-primary">{card.desc}</p>}
                    <p className="text-[11px] text-muted-foreground mt-0.5">{card.sub}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2">
            <div className="glass-morphism rounded-2xl border border-white/10 p-8">
              {sent ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-headline font-bold text-white">Message Received!</h3>
                  <p className="text-muted-foreground max-w-xs">We'll get back to you at <span className="text-white font-medium">{email}</span> within 24 hours.</p>
                  <button onClick={() => { setSent(false); setName(''); setEmail(''); setSubject(''); setMessage(''); }}
                    className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-colors">
                    Send Another
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {[
                      { label: 'Your Name', value: name, setter: setName, type: 'text', placeholder: 'Full name' },
                      { label: 'Email', value: email, setter: setEmail, type: 'email', placeholder: 'you@example.com' },
                    ].map(f => (
                      <div key={f.label} className="space-y-2">
                        <label className="text-sm font-medium text-white/80">{f.label}</label>
                        <input type={f.type} required value={f.value} onChange={e => f.setter(e.target.value)}
                          placeholder={f.placeholder}
                          className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors" />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/80">Subject</label>
                    <select value={subject} onChange={e => setSubject(e.target.value)} required
                      className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary/50 transition-colors appearance-none">
                      <option value="" className="bg-gray-900">Select a topic...</option>
                      <option value="credits" className="bg-gray-900">Credits & Billing</option>
                      <option value="generation" className="bg-gray-900">Video Generation Issue</option>
                      <option value="account" className="bg-gray-900">Account Problem</option>
                      <option value="payment" className="bg-gray-900">Payment Issue</option>
                      <option value="other" className="bg-gray-900">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/80">Message</label>
                    <textarea required value={message} onChange={e => setMessage(e.target.value)}
                      placeholder="Describe your issue or question in detail..."
                      rows={5}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors resize-none" />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full h-12 primary-gradient text-background font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-60 disabled:scale-100 flex items-center justify-center gap-2">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Sending...</> : <><Send className="w-4 h-4" />Send Message</>}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
