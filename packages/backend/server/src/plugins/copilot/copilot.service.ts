import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration, OpenAIApi } from 'openai';

@Injectable()
export class CopilotService {
  private readonly logger = new Logger(CopilotService.name);
  private readonly openai: OpenAIApi;
  private readonly embeddingModel: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('plugins.copilot.apiKey');
    const apiUrl = this.configService.get<string>('plugins.copilot.apiUrl');
    this.embeddingModel = this.configService.get<string>(
      'plugins.copilot.embeddingModel',
      'text-embedding-ada-002',
    );

    if (!apiKey) {
      this.logger.warn('OpenAI API key is not configured. Copilot functionality will be limited.');
    }

    const configuration = new Configuration({
      apiKey,
      basePath: apiUrl,
    });

    this.openai = new OpenAIApi(configuration);
  }

  /**
   * Generate embeddings for the provided texts
   * @param texts Array of texts to generate embeddings for
   * @returns Array of embeddings as number arrays
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts.length) {
      return [];
    }

    try {
      const response = await this.openai.createEmbedding({
        model: this.embeddingModel,
        input: texts,
      });

      return response.data.data.map(item => item.embedding);
    } catch (error) {
      this.logger.error(`Error generating embeddings: ${error.message}`, error.stack);
      throw error;
    }
  }
}
