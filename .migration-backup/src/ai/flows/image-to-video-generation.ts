'use server';
/**
 * @fileOverview A Genkit flow for generating AI videos using Paxsenix and Exsal APIs.
 * This flow handles multiple providers and implements polling for both.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getRandomPaxsenixKey } from '@/lib/api-keys';

const ImageToVideoGenerationInputSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').describe('Your text prompt to generate the video.'),
  ratio: z
    .enum(['16:9', '9:16'])
    .describe('The aspect ratio of the generated video.'),
  model: z
    .enum(['veo-3.1', 'grok-video', 'seedance-2.0', 'wan-2.2'])
    .describe('The AI model to use for video generation.'),
  imageUrl: z
    .string()
    .url()
    .optional()
    .describe('An optional image URL for image-to-video generation.'),
  endImageUrl: z
    .string()
    .url()
    .optional()
    .describe('An optional end image URL for Veo-3.1.'),
});
export type ImageToVideoGenerationInput = z.infer<typeof ImageToVideoGenerationInputSchema>;

const ImageToVideoGenerationOutputSchema = z.object({
  videoUrl: z.string().url().optional().describe('The URL of the generated video.'),
});
export type ImageToVideoGenerationOutput = z.infer<typeof ImageToVideoGenerationOutputSchema>;

/**
 * Server Action to generate video.
 */
export async function generateImageToVideo(
  input: ImageToVideoGenerationInput
): Promise<ImageToVideoGenerationOutput> {
  return imageToVideoGenerationFlow(input);
}

const imageToVideoGenerationFlow = ai.defineFlow(
  {
    name: 'imageToVideoGenerationFlow',
    inputSchema: ImageToVideoGenerationInputSchema,
    outputSchema: ImageToVideoGenerationOutputSchema,
  },
  async (input) => {
    const { prompt, ratio, model, imageUrl, endImageUrl } = input;

    // Handle Wan 2.2 separately (Exsal API)
    if (model === 'wan-2.2') {
      const apiKey = 'exs_davidcyril9_1010473f';
      let url;
      
      if (imageUrl) {
        // Image-to-Video endpoint
        url = `https://exsalapi.my.id/api/ai/video/wan-2.2/img2vid?image_url=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(prompt)}&apikey=${apiKey}`;
      } else {
        // Text-to-Video endpoint
        const mappedRatio = ratio === '16:9' ? 'landscape' : 'portrait';
        url = `https://exsalapi.my.id/api/ai/video/wan-2.2/txt2vid?prompt=${encodeURIComponent(prompt)}&ratio=${mappedRatio}&apikey=${apiKey}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Wan 2.2 API failed: ${response.status}`);
      
      const initialData = await response.json();
      if (!initialData.status || !initialData.data?.pollUrl) {
        throw new Error(initialData.message || "Failed to retrieve polling URL from Wan API.");
      }

      const pollUrl = initialData.data.pollUrl;
      let videoUrl = null;
      let attempts = 0;

      while (attempts < 60) { // Polling up to 5 minutes
        const pollResponse = await fetch(pollUrl);
        if (!pollResponse.ok) throw new Error(`Wan polling failed: ${pollResponse.status}`);
        
        const pollData = await pollResponse.json();

        // Check completion
        if (pollData.data?.status === 'completed' && pollData.data?.url) {
          videoUrl = pollData.data.url;
          break;
        }
        if (pollData.data?.status === 'failed') throw new Error("Wan 2.2 generation failed.");
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      }

      if (!videoUrl) throw new Error("Wan 2.2 generation timed out.");
      return { videoUrl };
    }

    // Handle Paxsenix models (veo-3.1, grok-video, seedance-2.0)
    const apiKey = getRandomPaxsenixKey();
    const queryParams = new URLSearchParams();
    queryParams.append('prompt', prompt);
    queryParams.append('ratio', ratio);
    queryParams.append('model', model);
    queryParams.append('type', imageUrl ? 'image-to-video' : 'text-to-video');

    let baseUrl = 'https://api.paxsenix.org/ai-video';
    let path = `/${model}`;
    
    if (imageUrl) {
      if (model === 'grok-video') queryParams.append('imageUrls', imageUrl);
      else queryParams.append('imageUrl', imageUrl);
      
      if (model === 'veo-3.1' && endImageUrl) {
        queryParams.append('endImageUrl', endImageUrl);
      }
    }

    const fullUrl = `${baseUrl}${path}?${queryParams.toString()}`;

    const response = await fetch(fullUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!response.ok) throw new Error(`Paxsenix API failed: ${response.status}`);
    const initialData = await response.json();
    
    if (!initialData.ok || !initialData.task_url) {
      throw new Error(initialData.message || "Failed to retrieve task URL.");
    }

    let videoUrl = null;
    let attempts = 0;
    while (attempts < 60) { // Polling up to 5 minutes
      const pollResponse = await fetch(initialData.task_url, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (!pollResponse.ok) throw new Error(`Paxsenix polling failed: ${pollResponse.status}`);
      
      const pollData = await pollResponse.json();

      if (pollData.status === 'done' && pollData.ok) {
        videoUrl = pollData.video_url || pollData.url;
        break;
      }
      if (pollData.status === 'failed') throw new Error("Paxsenix generation failed.");
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }

    if (!videoUrl) throw new Error("Paxsenix generation timed out.");
    return { videoUrl };
  }
);
