import { Logger } from '@nestjs/common';
import OpenAI from 'openai';

import { ICopilotProvider, withServiceName } from './provider';

@withServiceName('openai')
export class OpenAIProvider implements ICopilotProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  private openaiClient: OpenAI | null = null;

  async init(config: Record<string, any>): Promise<void> {
    this.logger.debug('initializing OpenAI provider');
    const apiKey = config.apiKey;
    if (!apiKey) {
      throw new Error('API key is required for OpenAI');
    }
    this.openaiClient = new OpenAI({
      apiKey,
    });
  }

  getModels(): string[] {
    return ['gpt-3.5-turbo', 'gpt-3.5-turbo-16k', 'gpt-4', 'gpt-4-32k', 'gpt-4-turbo-preview'];
  }

  async chat(messages: any[], options?: any): Promise<any> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }
    const resp = await this.openaiClient.chat.completions.create({
      model: options?.model || 'gpt-3.5-turbo',
      messages,
      stream: false,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
    });
    return resp;
  }

  async chatStream(messages: any[], options?: any): Promise<AsyncIterable<any>> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }
    const stream = await this.openaiClient.chat.completions.create({
      model: options?.model || 'gpt-3.5-turbo',
      messages,
      stream: true,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
    });
    return stream;
  }
  
  /**
   * Generate embeddings for given texts
   * @param texts - String or array of strings to generate embeddings for
   * @param model - Embedding model to use (default: 'text-embedding-3-small')
   * @returns Array of embeddings for each input text
   */
  async generateEmbedding(
    texts: string | string[],
    model: string = 'text-embedding-3-small'
  ): Promise<number[][]> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }
    
    // Ensure texts is an array
    const inputTexts = Array.isArray(texts) ? texts : [texts];
    
    try {
      const response = await this.openaiClient.embeddings.create({
        model,
        input: inputTexts,
      });
      
      // Extract embeddings from response
      return response.data.map(item => item.embedding);
    } catch (error) {
      this.logger.error('Error generating embeddings:', error);
      throw new Error('Failed to generate embeddings with OpenAI');
    }
  }
}
