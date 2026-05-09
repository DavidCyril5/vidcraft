import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Sparkles, Video as LucideVideo, Image as ImageIcon, Wand2, Loader2, Upload, X, CheckCircle2, Coins, Gift, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { enhancePrompt, generateVideo, uploadToTmpFiles } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  prompt: z.string().min(5, 'Prompt must be at least 5 characters.'),
  model: z.enum(['veo-3.1', 'grok-video', 'seedance-2.0', 'wan-2.2']),
  ratio: z.enum(['16:9', '9:16']),
  imageUrl: z.string().optional(),
  endImageUrl: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface GenerationFormProps {
  onGenerateStart: (values: FormValues) => void;
  onGenerateComplete: (videoUrl: string) => void;
  onGenerateError: () => void;
}

const MODEL_INFO: Record<string, { label: string; free: boolean; credits: number; waitMins: number }> = {
  'wan-2.2':      { label: 'Wan 2.2 (No Sound)',    free: true,  credits: 4,  waitMins: 4  },
  'veo-3.1':      { label: 'Veo 3.1 — Pro+',        free: false, credits: 10, waitMins: 7  },
  'grok-video':   { label: 'Grok Video — Pro+',      free: false, credits: 6,  waitMins: 5  },
  'seedance-2.0': { label: 'Seedance 2.0 — Pro+',    free: false, credits: 8,  waitMins: 10 },
};

const PROMPT_TEMPLATES = [
  { label: '🌅 City Sunrise', prompt: 'Cinematic aerial shot of a futuristic city at golden hour, flying drones visible, warm orange light on skyscrapers, 4K ultra-realistic.' },
  { label: '🦁 Lion Chase', prompt: 'A majestic lion sprinting across the African savanna at sunrise, dust particles in the air, slow motion, documentary style.' },
  { label: '🌊 Ocean Storm', prompt: 'Dramatic ocean waves crashing against sea cliffs during a storm, lightning in the distance, cinematic wide angle shot.' },
  { label: '🚀 Space Float', prompt: 'An astronaut floating weightlessly in space, Earth glowing blue behind them, stars twinkling, peaceful and cinematic.' },
  { label: '🌸 Blooming', prompt: 'Time-lapse of cherry blossom flowers blooming in a Japanese garden, morning dew on petals, soft bokeh, 4K.' },
  { label: '🎵 Neon Dance', prompt: 'Abstract geometric shapes morphing and flowing in vibrant neon colors on a dark background, music visualizer style.' },
  { label: '🏎️ Road Trip', prompt: 'Vintage red sports car driving along a coastal cliffside road at sunset, mountains in the background, drone perspective.' },
  { label: '🍜 Chef Art', prompt: 'A Michelin-star chef artistically plating a gourmet dish in a professional kitchen, close-up macro shot, slow motion.' },
];

export default function GenerationForm({ onGenerateStart, onGenerateComplete, onGenerateError }: GenerationFormProps) {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadingField, setUploadingField] = useState<'imageUrl' | 'endImageUrl' | null>(null);
  const [claimingCredit, setClaimingCredit] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const startFileRef = useRef<HTMLInputElement>(null);
  const endFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user, claimDailyWan, refreshUser } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { prompt: '', model: 'wan-2.2', ratio: '16:9', imageUrl: '', endImageUrl: '' },
  });

  useEffect(() => {
    try {
      const prefill = localStorage.getItem('vc_prefill');
      if (prefill) {
        const { prompt, model, ratio } = JSON.parse(prefill);
        if (prompt) form.setValue('prompt', prompt);
        if (model) form.setValue('model', model);
        if (ratio) form.setValue('ratio', ratio);
        localStorage.removeItem('vc_prefill');
      }
    } catch {}
  }, []);

  const selectedModel = form.watch('model');
  const imageUrl = form.watch('imageUrl');
  const endImageUrl = form.watch('endImageUrl');
  const isPaid = user?.plan !== 'free';
  const today = new Date().toISOString().slice(0, 10);
  const canClaimWan = user && user.dailyWanClaimed !== today;
  const modelInfo = MODEL_INFO[selectedModel];
  const creditCost = modelInfo?.credits ?? 4;
  const waitMins = modelInfo?.waitMins ?? 5;

  const handleEnhancePrompt = async () => {
    const currentPrompt = form.getValues('prompt');
    if (!currentPrompt || currentPrompt.length < 5) {
      toast({ title: 'Prompt too short', description: 'Enter a few words to enhance.', variant: 'destructive' });
      return;
    }
    setIsEnhancing(true);
    try {
      const result = await enhancePrompt(currentPrompt);
      form.setValue('prompt', result.enhancedPrompt);
      toast({ title: 'Prompt Enhanced!', description: 'Your idea has been expanded.' });
    } catch (error: any) {
      toast({ title: 'Enhancement Unavailable', description: error.message, variant: 'destructive' });
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleClaimCredit = async () => {
    setClaimingCredit(true);
    try {
      const result = await claimDailyWan();
      toast({ title: '1 Credit Claimed!', description: `You now have ${result.credits} credits.` });
    } catch (err: any) {
      toast({ title: 'Already Claimed', description: err.message, variant: 'destructive' });
    } finally {
      setClaimingCredit(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'imageUrl' | 'endImageUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image file.', variant: 'destructive' });
      return;
    }
    setUploadingField(fieldName);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const result = await uploadToTmpFiles(formData);
      form.setValue(fieldName, result.url);
      toast({ title: 'Image Ready', description: 'Your image has been uploaded.' });
    } catch (error: any) {
      toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploadingField(null);
      if (e.target) e.target.value = '';
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to generate videos.', variant: 'destructive' });
      window.location.href = '/login';
      return;
    }
    if (user.credits < creditCost) {
      toast({ title: 'Not enough credits', description: `This model needs ${creditCost} credits. You have ${user.credits}.`, variant: 'destructive' });
      return;
    }
    if (values.model !== 'wan-2.2' && !isPaid) {
      toast({ title: 'Pro model', description: 'Upgrade to Pro to use Veo 3.1, Grok Video, and Seedance 2.0.', variant: 'destructive' });
      return;
    }
    setIsGenerating(true);
    onGenerateStart(values);
    try {
      const result = await generateVideo({
        prompt: values.prompt, model: values.model, ratio: values.ratio,
        imageUrl: values.imageUrl || undefined, endImageUrl: values.endImageUrl || undefined,
      });
      if (result.videoUrl) {
        onGenerateComplete(result.videoUrl);
        await refreshUser();
      } else {
        throw new Error('No video was returned. Please try again.');
      }
    } catch (error: any) {
      onGenerateError();
      toast({ title: 'Generation Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="glass-morphism shadow-2xl overflow-hidden border border-white/10 rounded-3xl">
      <CardHeader className="space-y-1 p-6 md:p-8 border-b border-white/5">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl primary-gradient">
            <LucideVideo className="w-5 h-5 text-background" />
          </div>
          <CardTitle className="text-xl md:text-2xl font-headline">Create New Video</CardTitle>
        </div>
        <CardDescription className="text-sm text-muted-foreground">Select a model and craft your vision.</CardDescription>
        {user && (
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-white">{user.credits === 9999 ? '∞' : user.credits}</span>
              <span className="text-xs text-muted-foreground">credits</span>
            </div>
            {canClaimWan && (
              <button onClick={handleClaimCredit} disabled={claimingCredit}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20">
                {claimingCredit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Gift className="w-3 h-3" />}
                Claim daily credit
              </button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-6 md:p-8 space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={form.control} name="prompt" render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between mb-2">
                  <FormLabel className="text-sm font-medium">Visual Prompt</FormLabel>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setShowTemplates(!showTemplates)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5">
                      <Sparkles className="w-3 h-3" />Templates
                      <ChevronDown className={cn("w-3 h-3 transition-transform", showTemplates && "rotate-180")} />
                    </button>
                    <Button type="button" variant="ghost" size="sm"
                      className="h-8 text-primary hover:text-primary/80 gap-1.5 font-medium p-0 md:px-3"
                      onClick={handleEnhancePrompt} disabled={isEnhancing || isGenerating}>
                      {isEnhancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                      <span>Enhance</span>
                    </Button>
                  </div>
                </div>
                {showTemplates && (
                  <div className="grid grid-cols-2 gap-1.5 mb-3 p-3 rounded-xl bg-white/3 border border-white/5">
                    {PROMPT_TEMPLATES.map(t => (
                      <button key={t.label} type="button"
                        onClick={() => { form.setValue('prompt', t.prompt); setShowTemplates(false); }}
                        className="text-left px-3 py-2 rounded-lg text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors truncate">
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
                <FormControl>
                  <Textarea placeholder="Describe your video idea in detail..." className="min-h-[110px] bg-background/50 border-white/10 focus:border-primary/50 resize-none rounded-xl text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="model" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">AI Model</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background/50 border-white/10 rounded-xl h-11">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover border-white/10">
                      {Object.entries(MODEL_INFO).map(([val, info]) => (
                        <SelectItem key={val} value={val} disabled={!info.free && !isPaid}>
                          <span className={!info.free && !isPaid ? 'text-muted-foreground' : ''}>
                            {info.label} · {info.credits} credits · ~{info.waitMins}m
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="ratio" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Aspect Ratio</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background/50 border-white/10 rounded-xl h-11">
                        <SelectValue placeholder="Select ratio" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover border-white/10">
                      <SelectItem value="16:9">Widescreen (16:9)</SelectItem>
                      <SelectItem value="9:16">Vertical (9:16)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Reference Images (Optional)</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(['imageUrl', ...(selectedModel === 'veo-3.1' ? ['endImageUrl'] : [])] as const).map(fieldName => {
                  const isStart = fieldName === 'imageUrl';
                  const val = isStart ? imageUrl : endImageUrl;
                  return (
                    <div key={fieldName} className="space-y-1.5">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground px-1">{isStart ? 'Start Image' : 'End Image'}</p>
                      <div className={cn('relative h-20 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center transition-all hover:border-primary/40 overflow-hidden cursor-pointer', val && 'border-solid border-primary/30 bg-primary/5')}>
                        {uploadingField === fieldName ? (
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        ) : val ? (
                          <div className="flex flex-col items-center gap-1 text-primary">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-[10px] font-bold">Ready</span>
                            <button type="button" className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background/80 flex items-center justify-center" onClick={() => form.setValue(fieldName, '')}>
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button type="button" className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground" onClick={() => (isStart ? startFileRef : endFileRef).current?.click()}>
                            <Upload className="w-4 h-4" />
                            <span className="text-[10px] font-medium">Upload</span>
                          </button>
                        )}
                        <input type="file" ref={isStart ? startFileRef : endFileRef} className="hidden" accept="image/*" onChange={e => handleFileUpload(e, fieldName)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {!user ? (
              <a href="/signup" className="w-full h-14 primary-gradient text-background font-bold text-base rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" />Sign Up to Generate
              </a>
            ) : (
              <Button type="submit" className="w-full h-14 primary-gradient text-background font-bold text-base rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
                disabled={isGenerating || !!uploadingField || (user.credits < creditCost)}>
                {isGenerating
                  ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating — ~{waitMins} min wait...</>
                  : <><Sparkles className="w-5 h-5 mr-2" />Generate Video ({creditCost} Credits)</>}
              </Button>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
