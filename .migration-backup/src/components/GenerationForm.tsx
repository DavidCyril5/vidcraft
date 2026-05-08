"use client";

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Sparkles, Video as LucideVideo, Image as ImageIcon, Wand2, Loader2, Upload, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { enhancePrompt } from '@/ai/flows/prompt-enhancement-tool';
import { generateImageToVideo } from '@/ai/flows/image-to-video-generation';
import { uploadToTmpFiles } from '@/app/actions/upload-action';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  prompt: z.string().min(5, "Prompt must be at least 5 characters."),
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

export default function GenerationForm({ onGenerateStart, onGenerateComplete, onGenerateError }: GenerationFormProps) {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadingField, setUploadingField] = useState<'imageUrl' | 'endImageUrl' | null>(null);
  
  const startFileRef = useRef<HTMLInputElement>(null);
  const endFileRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: '',
      model: 'veo-3.1',
      ratio: '16:9',
      imageUrl: '',
      endImageUrl: '',
    },
  });

  const handleEnhancePrompt = async () => {
    const currentPrompt = form.getValues('prompt');
    if (!currentPrompt || currentPrompt.length < 5) {
      toast({
        title: "Prompt too short",
        description: "Please enter at least a few keywords to enhance.",
        variant: "destructive",
      });
      return;
    }

    logger.info("Enhancing prompt via AI...");
    setIsEnhancing(true);
    try {
      const result = await enhancePrompt({ briefIdea: currentPrompt });
      form.setValue('prompt', result.enhancedPrompt);
      logger.success("Prompt successfully enhanced", { original: currentPrompt, enhanced: result.enhancedPrompt });
      toast({
        title: "Prompt Enhanced!",
        description: "Your idea has been expanded for better results.",
      });
    } catch (error: any) {
      logger.error("Prompt enhancement failed", error.message);
      toast({
        title: "Enhancement Failed",
        description: "Could not enhance prompt. Try again later.",
        variant: "destructive",
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'imageUrl' | 'endImageUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    logger.info(`Uploading asset: ${file.name} to tmpfiles.org...`);
    setUploadingField(fieldName);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await uploadToTmpFiles(formData);
      form.setValue(fieldName, result.url);
      logger.success("Asset uploaded successfully", { field: fieldName, url: result.url });
      toast({
        title: "Upload Successful",
        description: "Image ready for generation.",
      });
    } catch (error: any) {
      logger.error("Asset upload failed", error.message);
      toast({
        title: "Upload Failed",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setUploadingField(null);
      if (e.target) e.target.value = '';
    }
  };

  const clearFile = (fieldName: 'imageUrl' | 'endImageUrl') => {
    logger.debug(`Asset cleared: ${fieldName}`);
    form.setValue(fieldName, '');
  };

  const onSubmit = async (values: FormValues) => {
    setIsGenerating(true);
    onGenerateStart(values);
    try {
      logger.info("Starting video generation pipeline...");
      const result = await generateImageToVideo({
        prompt: values.prompt,
        model: values.model,
        ratio: values.ratio,
        imageUrl: values.imageUrl || undefined,
        endImageUrl: values.endImageUrl || undefined,
      });
      
      if (result.videoUrl) {
        onGenerateComplete(result.videoUrl);
      } else {
        throw new Error("No video URL returned from the AI engine.");
      }
    } catch (error: any) {
      logger.error("Pipeline failure", error.message);
      onGenerateError();
      toast({
        title: "Generation Error",
        description: error.message || "Failed to start generation.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedModel = form.watch('model');
  const imageUrl = form.watch('imageUrl');
  const endImageUrl = form.watch('endImageUrl');

  return (
    <Card className="glass-morphism shadow-2xl overflow-hidden border-none max-w-2xl mx-auto">
      <CardHeader className="space-y-1 p-6 md:p-8 border-b border-white/5">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-xl primary-gradient">
            <LucideVideo className="w-5 h-5 text-background" />
          </div>
          <CardTitle className="text-xl md:text-2xl font-headline">Create New Video</CardTitle>
        </div>
        <CardDescription className="text-sm md:text-base text-muted-foreground">
          Select a model and craft your vision.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 md:p-8 space-y-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between mb-2">
                    <FormLabel className="text-sm font-medium">Visual Prompt</FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-primary hover:text-primary/80 gap-2 font-medium p-0 md:px-3"
                      onClick={handleEnhancePrompt}
                      disabled={isEnhancing || isGenerating}
                    >
                      {isEnhancing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="w-3.5 h-3.5" />
                      )}
                      <span>Enhance with AI</span>
                    </Button>
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your video idea..."
                      className="min-h-[100px] md:min-h-[120px] bg-background/50 border-white/10 focus:border-primary/50 resize-none rounded-xl transition-all text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">AI Model</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50 border-white/10 rounded-xl h-11">
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover border-white/10">
                        <SelectItem value="veo-3.1">Veo 3.1 (Google)</SelectItem>
                        <SelectItem value="wan-2.2">Wan 2.2 (New)</SelectItem>
                        <SelectItem value="grok-video">Grok Video</SelectItem>
                        <SelectItem value="seedance-2.0">Seedance 2.0</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ratio"
                render={({ field }) => (
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
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Asset Management</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground px-1">Start Image</p>
                  <div className={cn("relative h-24 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center transition-all hover:border-primary/50 overflow-hidden", imageUrl && "border-solid border-primary/30 bg-primary/5")}>
                    {uploadingField === 'imageUrl' ? (
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    ) : imageUrl ? (
                      <div className="flex flex-col items-center gap-1 text-primary">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-[10px] font-bold">Uploaded</span>
                        <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 rounded-full" onClick={() => clearFile('imageUrl')}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <button type="button" className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground" onClick={() => startFileRef.current?.click()}>
                        <Upload className="w-5 h-5" />
                        <span className="text-[10px] font-medium">Choose File</span>
                      </button>
                    )}
                    <input type="file" ref={startFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'imageUrl')} />
                  </div>
                </div>

                {selectedModel === 'veo-3.1' && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground px-1">End Image (Optional)</p>
                    <div className={cn("relative h-24 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center transition-all hover:border-primary/50 overflow-hidden", endImageUrl && "border-solid border-accent/30 bg-accent/5")}>
                      {uploadingField === 'endImageUrl' ? (
                        <Loader2 className="w-6 h-6 animate-spin text-accent" />
                      ) : endImageUrl ? (
                        <div className="flex flex-col items-center gap-1 text-accent">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-[10px] font-bold">Uploaded</span>
                          <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 rounded-full" onClick={() => clearFile('endImageUrl')}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <button type="button" className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground" onClick={() => endFileRef.current?.click()}>
                          <Upload className="w-5 h-5" />
                          <span className="text-[10px] font-medium">Choose File</span>
                        </button>
                      )}
                      <input type="file" ref={endFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'endImageUrl')} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-14 primary-gradient text-background font-bold text-lg rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
              disabled={isGenerating || !!uploadingField}
            >
              {isGenerating ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating...</>
              ) : (
                <><Sparkles className="w-5 h-5 mr-2" />Generate Video</>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
