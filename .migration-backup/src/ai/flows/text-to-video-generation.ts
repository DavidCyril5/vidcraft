'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating AI videos.
 *
 * - generateVideo - A function that handles the video generation process using Google's Veo model.
 * - TextToVideoGenerationInput - The input type for the generateVideo function.
 * - TextToVideoGenerationOutput - The return type for the generateVideo function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import { Readable } from 'stream'; // Node.js built-in stream module
import { MediaPart } from 'genkit'; // Import MediaPart for type hinting

// Define input schema
const TextToVideoGenerationInputSchema = z.object({
  prompt: z.string().describe('Your text prompt to generate the video.'),
  model: z.literal('veo-3.0-generate-preview').describe('The AI model to use for video generation. Currently only Google Veo 3.0 is supported.'),
  ratio: z.literal('16:9').describe('The aspect ratio of the generated video. Currently only 16:9 is supported with Veo 3.0.'),
  type: z.enum(['image-to-video']).optional().describe('Select `image-to-video` when generating videos based on provided images.'),
  imageUrl: z
    .string()
    .describe(
      "An image URL as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'. Required for 'image-to-video' type."
    )
    .optional(),
}).refine(data => !(data.type === 'image-to-video' && !data.imageUrl), {
  message: "imageUrl is required when type is 'image-to-video'",
  path: ['imageUrl'],
});

export type TextToVideoGenerationInput = z.infer<typeof TextToVideoGenerationInputSchema>;

// Define output schema
const TextToVideoGenerationOutputSchema = z.object({
  videoDataUri: z.string().describe('The generated video as a data URI (data:video/mp4;base64,...).'),
});

export type TextToVideoGenerationOutput = z.infer<typeof TextToVideoGenerationOutputSchema>;

// Wrapper function to call the flow
export async function generateVideo(
  input: TextToVideoGenerationInput
): Promise<TextToVideoGenerationOutput> {
  return generateVideoFlow(input);
}

// Helper function to fetch and convert video stream to base64
async function fetchVideoAndConvertToBase64(video: MediaPart): Promise<string> {
  if (!video.media?.url) {
    throw new Error('Video media URL is missing.');
  }

  // Dynamically import node-fetch as it's not a global in all environments.
  const fetch = (await import('node-fetch')).default;

  // Add API key before fetching the video.
  // The GEMINI_API_KEY is assumed to be available in the environment for Google models.
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not set in the environment variables.');
  }

  const videoDownloadResponse = await fetch(
    `${video.media.url}&key=${geminiApiKey}`
  );

  if (
    !videoDownloadResponse ||
    videoDownloadResponse.status !== 200 ||
    !videoDownloadResponse.body
  ) {
    throw new Error(`Failed to fetch video from URL: ${video.media.url} (Status: ${videoDownloadResponse.status})`);
  }

  const chunks: Buffer[] = [];
  const reader = Readable.from(videoDownloadResponse.body);

  // Convert stream to a Buffer
  for await (const chunk of reader) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const videoBuffer = Buffer.concat(chunks);

  // Return as data URI
  return `data:video/mp4;base64,${videoBuffer.toString('base64')}`;
}


// Define the Genkit flow
const generateVideoFlow = ai.defineFlow(
  {
    name: 'generateVideoFlow',
    inputSchema: TextToVideoGenerationInputSchema,
    outputSchema: TextToVideoGenerationOutputSchema,
  },
  async (input) => {
    let promptParts: (string | MediaPart)[] = [{ text: input.prompt }];

    if (input.type === 'image-to-video' && input.imageUrl) {
      const mimeMatch = input.imageUrl.match(/^data:(.*?);base64,/);
      const contentType = mimeMatch ? mimeMatch[1] : 'application/octet-stream'; // Default if not found

      promptParts = [
        {
          text: input.prompt,
        },
        {
          media: {
            contentType: contentType,
            url: input.imageUrl, // This is already a data URI
          },
        },
      ];
    }

    // Initiate video generation with Veo 3.0
    let { operation } = await ai.generate({
      model: googleAI.model(input.model), // input.model will be 'veo-3.0-generate-preview'
      prompt: promptParts,
      config: {
        // Veo 3.0 has fixed duration and enhanced prompt always on.
        aspectRatio: input.ratio, // Will be '16:9'
        // 'allow_all' is the only available personGeneration value for Veo 3.0
        personGeneration: 'allow_all',
      },
    });

    if (!operation) {
      throw new Error('Expected the model to return an operation for video generation.');
    }

    // Poll until the operation completes
    const maxPollingAttempts = 60; // Up to 5 minutes (60 * 5s)
    let attempts = 0;
    while (!operation.done && attempts < maxPollingAttempts) {
      operation = await ai.checkOperation(operation);
      if (!operation.done) {
        // Sleep for 5 seconds before checking again.
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
      attempts++;
    }

    if (!operation.done) {
        throw new Error('Video generation timed out.');
    }

    if (operation.error) {
      throw new Error(`Failed to generate video: ${operation.error.message}`);
    }

    const videoMediaPart = operation.output?.message?.content.find((p) => !!p.media);
    if (!videoMediaPart) {
      throw new Error('Failed to find the generated video media part in the operation output.');
    }

    // Fetch the video content and convert to data URI
    const videoDataUri = await fetchVideoAndConvertToBase64(videoMediaPart);

    return { videoDataUri };
  }
);
