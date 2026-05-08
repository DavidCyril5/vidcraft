'use server';
/**
 * @fileOverview A Genkit flow that enhances a brief video idea or keywords into a more detailed and effective prompt
 * using the Paxsenix prompt-enhancer API.
 *
 * - enhancePrompt - A function that handles the prompt enhancement process.
 * - PromptEnhancementInput - The input type for the enhancePrompt function.
 * - PromptEnhancementOutput - The return type for the enhancePrompt function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getRandomPaxsenixKey } from '@/lib/api-keys';

const PromptEnhancementInputSchema = z.object({
  briefIdea: z.string().describe('A brief video idea or keywords.'),
});
export type PromptEnhancementInput = z.infer<typeof PromptEnhancementInputSchema>;

const PromptEnhancementOutputSchema = z.object({
  enhancedPrompt: z.string().describe('A detailed and effective prompt for AI video generation.'),
});
export type PromptEnhancementOutput = z.infer<typeof PromptEnhancementOutputSchema>;

/**
 * Enhances a brief idea into a detailed prompt using the Paxsenix API.
 * @param input The input containing the brief idea.
 * @returns An object containing the enhanced prompt.
 */
export async function enhancePrompt(input: PromptEnhancementInput): Promise<PromptEnhancementOutput> {
  return promptEnhancementFlow(input);
}

const BASE_URL = 'https://api.paxsenix.org/ai-tools/prompt-enhancer';

const promptEnhancementFlow = ai.defineFlow(
  {
    name: 'promptEnhancementFlow',
    inputSchema: PromptEnhancementInputSchema,
    outputSchema: PromptEnhancementOutputSchema,
  },
  async (input) => {
    const { briefIdea } = input;
    const apiKey = getRandomPaxsenixKey();
    
    // Construct the URL with query parameters as the API expects a GET request
    const queryParams = new URLSearchParams();
    queryParams.append('prompt', briefIdea);
    
    const fullUrl = `${BASE_URL}?${queryParams.toString()}`;

    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API call failed with status ${response.status}.`);
      }

      const data = await response.json();
      
      // The API returns enhanced_prompt in the root of the JSON response
      if (data.ok && data.enhanced_prompt) {
        return { enhancedPrompt: data.enhanced_prompt };
      } else {
        throw new Error(data.message || "Failed to retrieve enhanced prompt from API.");
      }
    } catch (error: any) {
      console.error('Error in Paxsenix prompt enhancement flow:', error);
      throw new Error(`Enhancement failed: ${error.message}`);
    }
  }
);
