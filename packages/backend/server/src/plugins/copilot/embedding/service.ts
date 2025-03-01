import { Injectable, Logger } from '@nestjs/common';
import { CopilotService } from '../copilot.service';
import { PrismaService } from '../../../core/prisma';

interface EmbeddingChunk {
  index: number;
  content: string;
}

interface SimilarContentResult {
  docId: string;
  content: string;
  similarity: number;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(
    private readonly copilotService: CopilotService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create embedding for a document chunk
   */
  async createEmbedding(
    docId: string,
    workspaceId: string,
    chunks: EmbeddingChunk[],
  ): Promise<void> {
    if (!chunks.length) {
      return;
    }

    try {
      // Generate embeddings for all chunks
      const contents = chunks.map(chunk => chunk.content);
      const embeddings = await this.copilotService.generateEmbeddings(contents);

      // Store embeddings in the database
      await Promise.all(
        chunks.map((chunk, i) => 
          this.prisma.documentEmbedding.create({
            data: {
              docId,
              workspaceId,
              chunkIndex: chunk.index,
              content: chunk.content,
              embedding: embeddings[i],
            },
          })
        )
      );

      this.logger.log(`Created ${chunks.length} embeddings for document ${docId}`);
    } catch (error) {
      this.logger.error(`Error creating embeddings: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete all embeddings for a document
   */
  async deleteDocumentEmbeddings(docId: string): Promise<void> {
    await this.prisma.documentEmbedding.deleteMany({
      where: { docId },
    });
    this.logger.log(`Deleted embeddings for document ${docId}`);
  }

  /**
   * Find content similar to the provided query
   */
  async findSimilarContent(
    workspaceId: string,
    query: string,
    limit: number = 5,
    threshold: number = 0.7,
  ): Promise<SimilarContentResult[]> {
    try {
      // Generate embedding for the query
      const [queryEmbedding] = await this.copilotService.generateEmbeddings([query]);

      // Find similar content using vector similarity
      const results = await this.prisma.$queryRaw`
        SELECT 
          "docId", 
          content, 
          1 - (embedding <=> ${queryEmbedding}::vector) as similarity
        FROM "DocumentEmbedding"
        WHERE "workspaceId" = ${workspaceId}
        AND 1 - (embedding <=> ${queryEmbedding}::vector) > ${threshold}
        ORDER BY similarity DESC
        LIMIT ${limit}
      `;

      return results as SimilarContentResult[];
    } catch (error) {
      this.logger.error(`Error finding similar content: ${error.message}`, error.stack);
      throw error;
    }
  }
}
